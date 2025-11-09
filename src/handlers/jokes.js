import slugify from 'slugify';
import { generateMeta, isRateLimited, jsonResponse } from '../util/util';

export async function handleJokes(request, env, ctx) {

	const corsHeaders = {
		"Access-Control-Allow-Origin": "*", // Or your site URL instead of '*'
		"Access-Control-Allow-Methods": "GET,POST,OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type",
	};

	const url = new URL(request.url);

	if (url.pathname === "/jokes/categories" && request.method === "GET") {
		const { results } = await env.JOKES_DB.prepare(
			'SELECT DISTINCT category FROM jokes_br ORDER BY category ASC'
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
			'SELECT * FROM jokes_br WHERE category = ? ORDER BY id ASC'
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
			let { category, title, slug, text } = data;

			if (!text) {
				return new Response(
					JSON.stringify({ error: 'Missing required field: text' }),
					{
						status: 400,
						headers: {
							...corsHeaders,
							'Content-Type': 'application/json'
						}
					}
				);
			}

			// Auto-generate title if missing
			if (!title) {
				const words = text.trim().split(/\s+/).slice(0, 6).join(' ');
				title = words.charAt(0).toUpperCase() + words.slice(1);
			}

			// Auto-generate slug if missing
			if (!slug) {
				slug = slugify(title, { lower: true, strict: true });
			}

			// Check if slug already exists
			const existingSlug = await env.JOKES_DB.prepare(
				`SELECT slug FROM jokes_br WHERE slug = ? LIMIT 1`
			)
				.bind(slug)
				.first();

			// If exists, append unique ID
			if (existingSlug) {
				const uniqueId = crypto.randomUUID().split('-')[0]; // short unique id
				slug = `${uniqueId}-${slug}`;
			}

			category = category || "Outros";
			const author = "Uma Piada";
			const { metaTitle, metaDescription } = generateMeta({ title, text });

			const insertStmt = await env.JOKES_DB.prepare(
				`INSERT INTO jokes_br (category, title, slug, text, author, metaTitle, metaDescription)
				 VALUES (?, ?, ?, ?, ?, ?, ?)`
			)
				.bind(category, title, slug, text, author, metaTitle, metaDescription)
				.run();

			return new Response(
				JSON.stringify({ message: 'Joke created', slug, id: insertStmt.lastInsertRowid }),
				{
					status: 201,
					headers: {
						...corsHeaders,
						'Content-Type': 'application/json'
					}
				}
			);

		} catch (err) {
			return new Response(
				JSON.stringify({ error: 'Invalid JSON or DB error', details: err.message }),
				{
					status: 400,
					headers: {
						...corsHeaders,
						'Content-Type': 'application/json'
					}
				}
			);
		}
	}


	if (url.pathname === '/jokes/user-provided' && request.method === 'POST') {
		const ip = request.headers.get('cf-connecting-ip');
		const isBlocked = await isRateLimited(ip, env);

		if (isBlocked) {
			return jsonResponse({ message: 'Too many requests' }, 429);
		}

		try {
			const data = await request.json();
			const { author, text } = data;

			if (!author || !text) {
				return new Response(
					JSON.stringify({ error: 'Missing required fields: author and text are required' }),
					{ status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
				);
			}

			// Auto-generate title from first 6 words
			let title = text.trim().split(/\s+/).slice(0, 6).join(' ');
			title = title.charAt(0).toUpperCase() + title.slice(1);

			const { metaTitle, metaDescription } = generateMeta({ title, text });


			// Generate initial slug
			let slug = slugify(title, { lower: true, strict: true });

			// ✅ Check if slug already exists
			const existingSlug = await env.JOKES_DB.prepare(
				`SELECT slug FROM user_jokes_br WHERE slug = ? LIMIT 1`
			)
				.bind(slug)
				.first();

			// ✅ If exists, prepend unique ID
			if (existingSlug) {
				const uniqueId = crypto.randomUUID().split('-')[0]; // short unique prefix
				slug = `${uniqueId}-${slug}`;
			}

			// Insert into user_jokes table with timestamp
			const insertStmt = await env.JOKES_DB.prepare(
				`INSERT INTO user_jokes_br (author, text, title, slug, metaTitle, metaDescription, created_at)
				 VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
			)
				.bind(author, text, title, slug, metaTitle, metaDescription)
				.run();

			return new Response(
				JSON.stringify({ message: 'User joke submitted', id: insertStmt.lastInsertRowid }),
				{ status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
			);

		} catch (err) {
			return new Response(
				JSON.stringify({ error: 'Invalid JSON or DB error', details: err.message }),
				{ status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
			);
		}
	}



	return new Response('Not found', { status: 404 });
}


