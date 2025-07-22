import jokes from "../data/jokes";

export default {
    async scheduled(event, env, ctx) {

        const list = await env.SUBSCRIBERS.list();
        const emails = list.keys.map(key => key.name);

        if (emails.length === 0) return;

        function getJokeOfTheDay() {
            const today = new Date();
            const start = new Date(today.getFullYear(), 0, 0);
            const diff = today - start;
            const oneDay = 1000 * 60 * 60 * 24;
            const dayOfYear = Math.floor(diff / oneDay);
            return jokes[dayOfYear % jokes.length];
        }

        const joke = getJokeOfTheDay();

        const payload = {
            from: env.FROM_EMAIL,
            subject: "😂 Your Daily Joke",
            html: `
        <div style="font-family: sans-serif; background: #f9f9f9; padding: 20px;">
          <h2 style="color: #333;">😂 Joke of the Day</h2>
          <p style="font-size: 16px;">${joke}</p>
          <hr />
          <small style="color: #999;">You’re receiving this because you subscribed at DailyJoke.</small>
        </div>
      `,
        };

        // Send individually or batch (Resend supports up to 100 per call)
        for (let email of emails) {
            await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${env.RESEND_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ ...payload, to: email })
            });
        }
    }
};
