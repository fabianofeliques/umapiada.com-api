import { jsonResponse } from '../util/util';
import { HOME_URL } from '../config';
import { Resend } from 'resend';

export async function handleUnsubscribe(request, env) {
	if (request.method !== 'GET') {
		return jsonResponse({ message: 'Method not allowed' }, 405);
	}

	try {
		const url = new URL(request.url);
		const email = url.searchParams.get('email');
		const token = url.searchParams.get('token');

		if (!email || !token) {
			return jsonResponse({ message: 'Missing email or token' }, 400);
		}

		// 1. Find subscriber in DB
		const subscriber = await env.SUBSCRIBERS_DB.prepare(
			`SELECT * FROM subscribers WHERE email = ? AND unsubscribe_token = ? AND status = 1`
		).bind(email, token).first();

		if (!subscriber) {
			return jsonResponse({ message: 'Invalid unsubscribe link' }, 404);
		}

		// 2. Update local DB
		await env.SUBSCRIBERS_DB.prepare(
			`UPDATE subscribers SET status = 0, deactivated_at = datetime('now') WHERE id = ?`
		).bind(subscriber.id).run();

		// 3. Update Resend contact (unsubscribed)
		if (subscriber.resend_id) {
			const resend = new Resend(env.RESEND_API_KEY);
			await resend.contacts.update({
				audienceId: env.AUDIENCE_ID,
				id: subscriber.resend_id,
				unsubscribed: true,
			}).catch(err => {
				console.error("Failed to update Resend contact:", err);
			});
		}

		// 4. Redirect to success page
		return new Response(null, {
			status: 302,
			headers: { "Location": `https://www.daily-joke.com/unsubscribed/success` }
		});

	} catch (err) {
		console.error(err);
		return jsonResponse({ message: 'Something went wrong. Please try again later.' }, 500);
	}
}
