export async function handleLogin(request, env) {
	const corsHeaders = {
		"Access-Control-Allow-Origin": "*", // or your frontend URL instead of '*'
		"Access-Control-Allow-Methods": "POST, OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type",
	};

	if (request.method === "OPTIONS") {
		// Handle preflight
		return new Response(null, { headers: corsHeaders });
	}

	if (request.method !== "POST") {
		return new Response("Method Not Allowed", {
			status: 405,
			headers: corsHeaders,
		});
	}

	try {
		const { user, pass } = await request.json();

		const storedUser = await env.LOGIN.get("admin_username");
		const storedPass = await env.LOGIN.get("admin_password");

		if (user === storedUser && pass === storedPass) {
			const response = new Response(JSON.stringify({ success: true }), {
				status: 200,
				headers: {
					...corsHeaders,
					"Content-Type": "application/json",
				},
			});

			// Example: Set a simple auth cookie (not secure, just demo)
			response.headers.append(
				"Set-Cookie",
				`admin-auth=true; HttpOnly; Path=/; Max-Age=3600`
			);

			return response;
		} else {
			return new Response(JSON.stringify({ error: "Invalid credentials" }), {
				status: 401,
				headers: {
					...corsHeaders,
					"Content-Type": "application/json",
				},
			});
		}
	} catch (err) {
		return new Response(
			JSON.stringify({ error: "Invalid JSON or server error", details: err.message }),
			{
				status: 400,
				headers: {
					...corsHeaders,
					"Content-Type": "application/json",
				},
			}
		);
	}
}
