import { emailTemplates } from "../email/templates.js";
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
		const jokes = await env.JOKES_DB.prepare("SELECT * FROM jokes_br").all();
		if (!jokes.results.length) return console.log("No jokes found");
		const today = new Date();
		const start = new Date(today.getFullYear(), 0, 0);
		const diff = today.getTime() - start.getTime();
		const oneDay = 1000 * 60 * 60 * 24;
		const dayOfYear = Math.floor(diff / oneDay);
		const jokeIndex = dayOfYear % jokes.results.length;
		const currentJoke = jokes.results[jokeIndex];
		const selectedTemplate = emailTemplates[Math.floor(Math.random() * emailTemplates.length)];

		const jokeUrl = `https://www.umapiada.com.br/${currentJoke.category}/${currentJoke.slug}`;

		// 2️⃣ Fetch all active subscribers_br
		const allSubscribers = await env.SUBSCRIBERS_DB.prepare(
			`SELECT email, unsubscribe_token FROM subscribers_br WHERE status = 1 AND is_confirmed = 1`
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

				const htmlContent = selectedTemplate.html({
					currentJoke,
					jokeUrl,
					unsubscribeLink,
				});

				const emailOptions = {
					from: "Daily Joke <newsletter@daily-joke.com>",
					to: email,
					subject: selectedTemplate.subject,
					html: htmlContent,
				};

				const success = await safeSendEmail(emailOptions);

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
