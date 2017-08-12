import fetch from 'isomorphic-fetch';
import resource from 'resource-router-middleware';
import cheerio from 'cheerio';

export default ({ config, gh }) => resource({

	/** Property name to store preloaded entity on `request`. */
	id : 'list',

	/** For requests with an `id`, you can auto-load the entity.
	 *  Errors terminate the request, success sets `req[id] = data`.
	 */
	load(req, id, callback) {
		// let list = lists.find( list => list.id===id ),
		// 	err = list ? null : 'Not found';
		// callback(err, list);
	},

	/** GET / - List all entities */
	index({ params }, res) {
		fetch(`https://api.github.com/repos/sindresorhus/awesome/readme`, {
			headers: {
				'Accept': 'application/vnd.github.v3.html'
			}
		})
			.then(res => res.text())
			.then(html => {
				const $ = cheerio.load(html);
				const entry = $('.entry-content');

				const categories = entry.find('h2').eq(0).next('ul').find('li > a');

				const result = categories.map((i, a) => {
					const
						href = $(a).attr('href'),
						title = $(a).text().trim();

					const _items = $(`a[href="${href}"]`).parent('h2').next('ul').find('li > a');
					const items = _items.map((i, a) => {
						const _subitems = $(a).next('ul');
						let subitems = null;
						if (_subitems.length > 0) {
							subitems = _subitems.find('li > a').map((i, a) => {
								return {
									title: $(a).text().trim(),
									link: $(a).attr('href')
								}
							}).get();
						}

						return {
							title: $(a).text().trim(),
							link: $(a).attr('href'),
							subitems
						}
					}).get();

					return { href, title, items };
				}).get();

				// console.log(result);

				res.json(result);
			})


		// const ghrepo = gh.repo('sindresorhus/awesome');

		// ghrepo.readme((err, data, headers) => {
		// 	console.log(err);
		// 	if (err && err !== {}) {
		// 		res.status(404).json(err.body);
		// 		return;
		// 	}

		// 	res.json({});
		// })
	},

	/** GET /:id - Return a given entity */
	read({ list }, res) {
		res.json(list);
	}
});
