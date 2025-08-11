export async function handleLogin(request, env) {
	if (request.method !== "POST") {
		return new Response("Method Not Allowed", { status: 405 });
	}

	const { user, pass } = await request.json();

	const storedUser = await env.LOGIN.get("admin_username");
	const storedPass = await env.LOGIN.get("admin_password");

	if (user === storedUser && pass === storedPass) {
		// Generate some kind of session token or simple cookie
		const response = new Response(JSON.stringify({ success: true }), {
			headers: { "Content-Type": "application/json" },
		});

		// Example: Set a simple auth cookie (not secure, just demo)
		response.headers.append(
			"Set-Cookie",
			`admin-auth=true; HttpOnly; Path=/; Max-Age=3600`
		);

		return response;
	}

	return new Response(JSON.stringify({ error: "Invalid credentials" }), {
		status: 401,
		headers: { "Content-Type": "application/json" },
	});
}
