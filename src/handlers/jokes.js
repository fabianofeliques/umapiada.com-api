
export async function handleJokes(request, env, ctx) {
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

			const { category, title, slug, text, author } = data;

			if (!title || !slug || !text) {
				return new Response(
					JSON.stringify({ error: 'Missing required fields: title, slug, text' }),
					{ status: 400, headers: { 'Content-Type': 'application/json' } }
				);
			}

			const insertStmt = await env.JOKES_DB.prepare(
				`INSERT INTO jokes (category, title, slug, text, author)
         VALUES (?, ?, ?, ?, ?)`
			)
				.bind(category ? category : "Others", title, slug, text, author || 'Anonymous')
				.run();

			return new Response(
				JSON.stringify({ message: 'Joke created', id: insertStmt.lastInsertRowid }),
				{ status: 201, headers: { 'Content-Type': 'application/json' } }
			);

		} catch (err) {
			return new Response(
				JSON.stringify({ error: 'Invalid JSON or DB error', details: err.message }),
				{ status: 400, headers: { 'Content-Type': 'application/json' } }
			);
		}
	}

	return new Response('Not found', { status: 404 });
}


