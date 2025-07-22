export async function onRequestPost({ request, env }) {
    const { email } = await request.json();

    if (!email || !email.includes("@")) {
        return new Response(JSON.stringify({ message: "Invalid email." }), { status: 400 });
    }

    await env.SUBSCRIBERS.put(email, JSON.stringify({ subscribedAt: Date.now() }));

    return new Response(JSON.stringify({ message: "You're subscribed!" }), { status: 200 });
}
