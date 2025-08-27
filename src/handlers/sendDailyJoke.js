import { Resend } from "resend";
import { HOME_URL } from '../config';

export async function sendJokeOfTheDay(env) {
	const resend = new Resend(env.RESEND_API_KEY);
	const AUDIENCE_ID = env.AUDIENCE_ID;
	const RATE_LIMIT = 2; // emails per second
	const BATCH_DELAY = 1000; // ms between batches

	function delay(ms) {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	async function safeSendEmail(options) {
		let attempt = 0;
		while (attempt < 5) {
			try {
				await resend.emails.send(options);
				return true;
			} catch (err) {
				if (err?.statusCode === 429) {
					const wait = (attempt + 1) * 1000;
					console.warn(`Rate limited. Retrying in ${wait}ms for ${options.to}`);
					await delay(wait);
					attempt++;
				} else {
					console.error("Send failed for", options.to, err);
					return false;
				}
			}
		}
		console.error("Failed after max retries:", options.to);
		return false;
	}

	try {
		// 1️⃣ Fetch all jokes
		const jokes = await env.JOKES_DB.prepare("SELECT * FROM jokes").all();
		if (!jokes.results.length) return console.log("No jokes found");
		const today = new Date();
		const jokeIndex = today.getDate() % jokes.results.length;
		const currentJoke = jokes.results[jokeIndex];

		// 2️⃣ Fetch all active subscribers
		const allSubscribers = await env.SUBSCRIBERS_DB.prepare(
			`SELECT email, unsubscribe_token FROM subscribers WHERE status = 1`
		).all();

		if (!allSubscribers.results.length) return console.log("No active subscribers");

		const emailsSent = new Set();

		// 3️⃣ Send emails in batches to respect rate limit
		for (let i = 0; i < allSubscribers.results.length; i += RATE_LIMIT) {
			const batch = allSubscribers.results.slice(i, i + RATE_LIMIT);

			await Promise.all(batch.map(async (subscriber) => {
				const { email, unsubscribe_token } = subscriber;
				if (!email || emailsSent.has(email)) return;

				const unsubscribeLink = `${HOME_URL}/unsubscribe?email=${encodeURIComponent(email)}&token=${unsubscribe_token}`;

				const htmlContent = `
					<html lang="en"><body style="font-family: 'Segoe UI', sans-serif; text-align: center; padding: 2rem; color: #333; background: #fafafa;">
					<div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; padding: 2rem; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
						<h1 style="font-size: 2rem; margin-bottom: 1rem;">😂 Your Daily Dose of Humor!</h1>
						<p style="font-size: 1.1rem; color: #555; margin-bottom: 1.5rem;">
							Another day, another joke to make your coffee spill. Here’s today’s gem:
						</p>
						<blockquote style="font-size: 1.4rem; font-weight: bold; line-height: 1.6; color: #222; border-left: 4px solid #ff9800; padding-left: 1rem; margin: 1rem 0;">
							${currentJoke.text.replace(/\n/g, "<br>")}
						</blockquote>
						<p style="margin-top: 2rem; font-size: 1rem; color: #444;">
							👉 Love silly jokes? Check out our
							<a href="https://www.daily-joke.com" style="color: #1e88e5; font-weight: bold; text-decoration: none;">Website</a>
							or follow us on
							<a href="https://instagram.com/dailydashjoke" style="color: #e1306c; font-weight: bold; text-decoration: none;">Instagram</a>
							for even more laughs!
						</p>
						<hr style="margin: 2rem 0; border: none; border-top: 1px solid #ddd;">
						<p style="font-size: 0.85rem; color: #888;">
							Want to stop receiving jokes?
							<a href="${unsubscribeLink}" style="color: #555; text-decoration: underline;">Click here to unsubscribe</a>.
						</p>
					</div>
					</body></html>
				`;

				const success = await safeSendEmail({
					from: "Daily Joke <no-reply@daily-joke.com>",
					to: email,
					subject: "Your Daily Joke is Here! 😂",
					html: htmlContent,
				});

				if (success) emailsSent.add(email);
			}));

			// Wait before next batch
			await delay(BATCH_DELAY);
		}

		console.log(`Emails sent: ${emailsSent.size}`);
	} catch (err) {
		console.error("Unexpected error in sendJokeOfTheDay:", err);
	}
}
