import slugify from 'slugify';

export async function handleJokes(request, env, ctx) {

	const corsHeaders = {
		"Access-Control-Allow-Origin": "*", // Or your site URL instead of '*'
		"Access-Control-Allow-Methods": "GET,POST,OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type",
	};

	const url = new URL(request.url);

	if (url.pathname === "/jokes/categories" && request.method === "GET") {
		const { results } = await env.JOKES_DB.prepare(
			'SELECT DISTINCT category FROM jokes ORDER BY category ASC'
		).all();

		const categories = results.map(row => row.category);

		return new Response(JSON.stringify(categories), {
			headers: { 'Content-Type': 'application/json' },
		});
	}

	if (url.pathname === '/jokes/byCategory' && request.method === 'GET') {
		const category = url.searchParams.get('category');
		if (!category) {
			return new Response(
				JSON.stringify({ error: 'Missing category param' }),
				{
					status: 400,
					headers: { 'Content-Type': 'application/json' },
				}
			);
		}

		const { results } = await env.JOKES_DB.prepare(
			'SELECT * FROM jokes WHERE category = ? ORDER BY id ASC'
		)
			.bind(category)
			.all();

		return new Response(JSON.stringify(results), {
			headers: { 'Content-Type': 'application/json' },
		});
	}

	if (url.pathname === '/jokes/create' && request.method === 'POST') {
		try {
			const data = await request.json();

			let { category, title, slug, text, author } = data;

			if (!text) {
				return new Response(
					JSON.stringify({ error: 'Missing required field: text' }),
					{ status: 400,     headers: {
							...corsHeaders,
							'Content-Type': 'application/json'
						}
					 }
				);
			}

			// Auto-generate title if missing
			if (!title) {
				// Take first 6 words of the joke text
				const words = text.trim().split(/\s+/).slice(0, 6).join(' ');
				title = words.charAt(0).toUpperCase() + words.slice(1);
			}

			// Auto-generate slug if missing
			if (!slug) {
				slug = slugify(title, { lower: true, strict: true });
			}

			// Default category and author
			category = category || "Others";
			author = author || "Daily Joke";

			const insertStmt = await env.JOKES_DB.prepare(
				`INSERT INTO jokes (category, title, slug, text, author)
				 VALUES (?, ?, ?, ?, ?)`
			)
				.bind(category, title, slug, text, author)
				.run();

			return new Response(
				JSON.stringify({ message: 'Joke created', id: insertStmt.lastInsertRowid }),
				{ status: 201, headers: {
						...corsHeaders,
						'Content-Type': 'application/json'
					}
				}
			);

		} catch (err) {
			return new Response(
				JSON.stringify({ error: 'Invalid JSON or DB error', details: err.message }),
				{ status: 400, headers: {
						...corsHeaders,
						'Content-Type': 'application/json'
					} }
			);
		}
	}


	return new Response('Not found', { status: 404 });
}


