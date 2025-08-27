import { Resend } from "resend";
import { HOME_URL } from '../config';

export async function sendJokeOfTheDayBatch(env) {
	const resend = new Resend(env.RESEND_API_KEY);
	const AUDIENCE_ID = env.AUDIENCE_ID;

	function delay(ms) {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	async function safeSendEmail(options) {
		let attempt = 0;
		while (attempt < 5) {
			try {
				return await resend.emails.send(options);
			} catch (err) {
				if (err?.statusCode === 429) {
					const wait = (attempt + 1) * 1000;
					console.warn(`Rate limited. Retrying in ${wait}ms`);
					await delay(wait);
					attempt++;
				} else {
					console.error("Send failed:", err);
					return null;
				}
			}
		}
		console.error("Failed after max retries:", options.to);
		return null;
	}

	try {
		// 1️⃣ Fetch all jokes
		const jokes = await env.JOKES_DB.prepare("SELECT * FROM jokes").all();
		if (!jokes.results.length) return console.log("No jokes found");

		const today = new Date();
		const jokeIndex = today.getDate() % jokes.results.length;
		const currentJoke = jokes.results[jokeIndex];

		// 2️⃣ Fetch all active subscribers at once
		const allSubscribers = await env.SUBSCRIBERS_DB.prepare(
			`SELECT email, unsubscribe_token FROM subscribers WHERE status = 1`
		).all();

		const subscriberMap = {};
		for (const s of allSubscribers.results) {
			subscriberMap[s.email] = s.unsubscribe_token;
		}

		// 3️⃣ Fetch all Resend contacts
		const contactsResp = await resend.contacts.list({ audienceId: AUDIENCE_ID });
		const contacts = contactsResp?.data?.data;
		if (!Array.isArray(contacts)) {
			console.error("Contacts response not in expected format:", contactsResp);
			return;
		}

		// 4️⃣ Loop through contacts
		for (const contact of contacts) {
			if (!contact.email || contact.unsubscribed) continue;

			const token = subscriberMap[contact.email];
			if (!token) continue; // skip if not in DB

			const unsubscribeLink = `${HOME_URL}/unsubscribe?email=${encodeURIComponent(contact.email)}&token=${token}`;

			const htmlContent = `
				<html lang="en">
				<body style="font-family: 'Segoe UI', sans-serif; text-align: center; padding: 2rem; color: #333; background: #fafafa;">
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
						<a href="${unsubscribeLink}" style="color: #555; text-decoration: underline;">
							Click here to unsubscribe
						</a>.
					</p>
				</div>
				</body>
				</html>
			`;

			await safeSendEmail({
				from: "Daily Joke <no-reply@daily-joke.com>",
				to: contact.email,
				subject: "Your Daily Joke is Here! 😂",
				html: htmlContent,
			});

			// throttle to 2/sec
			await delay(500);
		}
	} catch (err) {
		console.error("Unexpected error in sendJokeOfTheDayBatch:", err);
	}
}
