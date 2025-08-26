import { Resend } from "resend";

export async function sendJokeOfTheDayBatch(env) {

	const resend = new Resend(env.RESEND_API_KEY);
	const AUDIENCE_ID = env.AUDIENCE_ID;
	// 1. Fetch all jokes from your D1 database
	const jokes = await env.JOKES_DB.prepare("SELECT * FROM jokes").all();

	if (!jokes.results.length) return console.log("No jokes found");

	// 2. Pick today's joke (e.g., based on date)
	const today = new Date();
	const jokeIndex = today.getDate() % jokes.results.length;
	const currentJoke = jokes.results[jokeIndex];

	// 3. Fetch all contacts
	const contacts = await resend.contacts.list({ audienceId: AUDIENCE_ID });


	// 4. Loop through contacts and send personalized emails
	for (const contact of contacts.data) {
		if (!contact.email || contact.unsubscribed) continue;

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
          👉 Love silly jokes? Follow us on
          <a href="https://instagram.com/dailydashjoke" style="color: #e1306c; font-weight: bold; text-decoration: none;">
            Instagram
          </a>
          for even more laughs!
        </p>

        <hr style="margin: 2rem 0; border: none; border-top: 1px solid #ddd;">

        <p style="font-size: 0.85rem; color: #888;">
          Want to stop receiving jokes?
          <a href="https://api.resend.com/audiences/${AUDIENCE_ID}/unsubscribe?email=${encodeURIComponent(contact.email)}"
             style="color: #555; text-decoration: underline;">
            Click here to unsubscribe
          </a>.
        </p>
      </div>
    </body>
  </html>
`;

		await resend.emails.send({
			from: "Daily Joke <no-reply@daily-joke.com>",
			to: contact.email,
			subject: "Your Daily Joke is Here! 😂",
			html: htmlContent,
		});
	}
}
