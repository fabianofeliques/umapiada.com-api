import { isRateLimited, jsonResponse } from '../util/util';
import { HOME_URL } from '../config';
import { Resend } from 'resend';

export function generateToken(size = 16) {
	const array = new Uint8Array(size);

	crypto.getRandomValues(array);

	return [...array].map(b => b.toString(16).padStart(2, '0')).join('');
}


export async function handleSubscribe(request, env) {

	if (request.method !== 'POST') {
		return jsonResponse({ message: 'Method not allowed' }, 405);
	}

	const ip = request.headers.get('cf-connecting-ip');
	const isBlocked = await isRateLimited(ip, env);

	if (isBlocked) {
		return jsonResponse({ message: 'Muitas requisições em curto tempo' }, 429);
	}

	try {
		const { email } = await request.json();

		if (!email || !email.includes('@')) {
			return jsonResponse({ message: 'Endereço de email inválido' }, 400);
		}

		const existing = await env.SUBSCRIBERS_DB.prepare(
			`SELECT *
			 FROM subscribers_br
			 WHERE email = ?`
		).bind(email).first();

		if (existing && existing.status) {
			return jsonResponse({ message: 'Email já inscrito' }, 409);
		}

		const confirmation_token = generateToken();
		const unsubscribe_token = generateToken();

		if (existing && !existing.status) {
			await env.SUBSCRIBERS_DB.prepare(
				`UPDATE subscribers_br
				 SET is_confirmed       = 0,
						 confirmation_token = ?,
						 unsubscribe_token  = ?,
						 status             = 0,
						 ip_address         = ?,
						 created_at         = datetime('now'),
						 confirmed_at       = NULL,
						 deactivated_at       = NULL
				 WHERE email = ?`
			)
				.bind(confirmation_token, unsubscribe_token, ip, email)
				.run();

		} else {
			await env.SUBSCRIBERS_DB.prepare(
				`INSERT INTO subscribers_br
				 (email, is_confirmed, confirmation_token, unsubscribe_token, status, ip_address, created_at, deactivated_at)
				 VALUES (?, 0, ?, ?, 0, ?, datetime('now'), NULL)`
			)
				.bind(email, confirmation_token, unsubscribe_token, ip)
				.run();
		}

		const confirmationLink = `${HOME_URL}/confirm?token=${confirmation_token}&email=${encodeURIComponent(email)}`;

		await sendConfirmationEmail(email, confirmationLink, env);

		return jsonResponse({ message: 'Por favor, verifique seu email para confirmar sua inscrição!' });

	} catch (err) {
		console.error(err);
		return jsonResponse({ message: 'Algo deu errado. Por favor tente novamente.' }, 500);
	}
}

async function sendConfirmationEmail(email, confirmationLink, env) {
	const resendApiKey = env.RESEND_API_KEY;

	const res = await fetch('https://api.resend.com/emails', {
		method: 'POST',
		headers: {
			'Authorization': `Bearer ${resendApiKey}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			from: 'Uma Piada <contato@umapiada.com.br>',
			to: [email],
			subject: 'Por favor confirme sua inscrição',
			html: `
				<html lang="pt-BR">
					<body style="font-family: sans-serif; text-align: center; padding: 2rem; color: #333;">
						<h2>Quase lá! 🕺</h2>
						<p>Você se inscreveu para uma dose diária de humor.</p>
						<p>Mas antes de abrirmos a porteira do humor, precisamos verificar se realmente é você.</p>
      			<a href="${confirmationLink}"
      							 style="display: inline-block; padding: 12px 24px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 4px; margin-top: 1rem;">
							Confirmar email.
						</a>
						<p style="margin-top: 2rem; font-size: 0.9rem; color: #777;">Se não foi você, não precisa se preocupar - apenas ignore este email. Nenhuma piada se sentirá ofendida.</p>
					</body>
				</html>
      `
		})
	});

	if (!res.ok) {
		const errorText = await res.text();
		console.error('Error ao enviar email de confirmação:', errorText);
		throw new Error('Error ao enviar email de confirmação');
	}
}


export async function handleConfirm(request, env) {
	if (request.method !== 'GET') {
		return jsonResponse({ message: 'Method not allowed' }, 405);
	}

	const url = new URL(request.url);
	const email = url.searchParams.get('email');
	const token = url.searchParams.get('token');

	if (!token) {
		return jsonResponse({ message: 'Token não existente' }, 400);
	}

	const subscriber = await env.SUBSCRIBERS_DB.prepare(
		`SELECT *
		 FROM subscribers_br
		 WHERE email = ?
			 AND confirmation_token = ?
			 AND is_confirmed = 0
			 AND status = 0`
	).bind(email, token).first();


	if (!subscriber) {
		return jsonResponse({ message: 'Token inválido' }, 404);
	}

	if (subscriber.is_confirmed) {
		return jsonResponse({ message: 'Inscrição já confirmada' }, 200);
	}

	const result = await env.SUBSCRIBERS_DB.prepare(
		`UPDATE subscribers_br
		 SET is_confirmed = 1,
				 status = 1,
				 confirmed_at = datetime('now')
		 WHERE id = ?`
	).bind(subscriber.id).run();

	await addEmailToResendList(email, env);

	const cookieValue = result.changes !== 0 ? "success" : "error";

	return new Response(null, {
		status: 302,
		headers: {
			"Location": `https://www.umapiada.com.br/subscribed/${cookieValue}`,
		}
	})
}

export async function addEmailToResendList(email, env) {
	const resend = new Resend(env.RESEND_API_KEY);

	const decodedEmail = decodeURIComponent(email);
	console.log('Decoded email:', decodedEmail);

	try {
		const res = await resend.contacts.create({
			email,
			unsubscribed: false,
			audienceId: env.AUDIENCE_ID,
		});
		console.log('Create response:', res);

		let contactId = res?.data.id;
		console.log('Initial contactId from create:', contactId);

		// If no ID is returned (existing unsubscribed contact), fetch it
		if (!contactId) {
			console.log('Fetching existing contact...');
			const existing = await resend.contacts.get({
				email: decodedEmail,
				audienceId: env.AUDIENCE_ID,
			});
			console.log('Get response:', existing);

			if (existing?.id) {
				contactId = existing.data.id;
			}
			console.log('ContactId after get:', contactId);
		}

		// Save the ID in your DB
		if (contactId) {
			console.log(`Saving contactId ${contactId} for email ${email} to DB`);
			await env.SUBSCRIBERS_DB.prepare(
				`UPDATE subscribers_br SET resend_id = ? WHERE email = ?`
			).bind(contactId, email).run();
		} else {
			console.warn('Could not get Resend contact ID for', email);
		}

	} catch (error) {
		console.error('Error creating Resend contact:', error);
	}
}



