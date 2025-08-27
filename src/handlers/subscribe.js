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
		return jsonResponse({ message: 'Too many requests' }, 429);
	}

	try {
		const { email } = await request.json();

		if (!email || !email.includes('@')) {
			return jsonResponse({ message: 'Invalid email address' }, 400);
		}

		const existing = await env.SUBSCRIBERS_DB.prepare(
			`SELECT *
			 FROM subscribers
			 WHERE email = ?`
		).bind(email).first();

		if (existing && existing.status) {
			return jsonResponse({ message: 'Already subscribed' }, 409);
		}

		const confirmation_token = generateToken();
		const unsubscribe_token = generateToken();

		if (existing && !existing.status) {
			await env.SUBSCRIBERS_DB.prepare(
				`UPDATE subscribers
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
				`INSERT INTO subscribers
				 (email, is_confirmed, confirmation_token, unsubscribe_token, status, ip_address, created_at, deactivated_at)
				 VALUES (?, 0, ?, ?, 0, ?, datetime('now'), NULL)`
			)
				.bind(email, confirmation_token, unsubscribe_token, ip)
				.run();
		}

		const confirmationLink = `${HOME_URL}/confirm?token=${confirmation_token}&email=${encodeURIComponent(email)}`;

		await sendConfirmationEmail(email, confirmationLink, env);

		return jsonResponse({ message: 'Please check your email to confirm your subscription!' });

	} catch (err) {
		console.error(err);
		return jsonResponse({ message: 'Something went wrong. Please try again later.' }, 500);
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
			from: 'Daily Joke <contact@daily-joke.com>',
			to: [email],
			subject: 'Please confirm your subscription',
			html: `
				<html lang="en">
					<body style="font-family: sans-serif; text-align: center; padding: 2rem; color: #333;">
						<h2>Almost there! 🕺</h2>
						<p>You've just signed up for a daily dose of harmless humor.</p>
						<p>But before we unleash the giggles, we need to make sure it's really you.</p>
      			<a href="${confirmationLink}"
      							 style="display: inline-block; padding: 12px 24px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 4px; margin-top: 1rem;">
							Confirm email.
						</a>
						<p style="margin-top: 2rem; font-size: 0.9rem; color: #777;">If you didn't subscribe, no worries — just ignore this email. No jokes will be harmed.</p>
					</body>
				</html>
      `
		})
	});

	if (!res.ok) {
		const errorText = await res.text();
		console.error('Failed to send confirmation email:', errorText);
		throw new Error('Failed to send confirmation email');
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
		return jsonResponse({ message: 'Missing token' }, 400);
	}

	const subscriber = await env.SUBSCRIBERS_DB.prepare(
		`SELECT *
		 FROM subscribers
		 WHERE email = ?
			 AND confirmation_token = ?
			 AND is_confirmed = 0
			 AND status = 0`
	).bind(email, token).first();


	if (!subscriber) {
		return jsonResponse({ message: 'Invalid token' }, 404);
	}

	if (subscriber.is_confirmed) {
		return jsonResponse({ message: 'Subscription already confirmed' }, 200);
	}

	const result = await env.SUBSCRIBERS_DB.prepare(
		`UPDATE subscribers
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
			"Location": `https://www.daily-joke.com/subscribed/${cookieValue}`,
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

		let contactId = res?.id;
		console.log('Initial contactId from create:', contactId);

		// If no ID is returned (existing unsubscribed contact), fetch it
		if (!contactId) {
			console.log('Fetching existing contact...');
			const existing = await resend.contacts.get({
				decodedEmail,
				audienceId: env.AUDIENCE_ID,
			});
			console.log('Get response:', existing);

			if (existing?.id) {
				contactId = existing.id;
			}
			console.log('ContactId after get:', contactId);
		}

		// Save the ID in your DB
		if (contactId) {
			console.log(`Saving contactId ${contactId} for email ${email} to DB`);
			await env.SUBSCRIBERS_DB.prepare(
				`UPDATE subscribers SET resend_id = ? WHERE email = ?`
			).bind(contactId, email).run();
		} else {
			console.warn('Could not get Resend contact ID for', email);
		}

	} catch (error) {
		console.error('Error creating Resend contact:', error);
	}
}



