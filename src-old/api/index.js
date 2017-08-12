import { version } from '../../package.json';
import { Router } from 'express';
import lists from './lists';

export default ({ config, gh }) => {
	let api = Router();

	// mount the lists resource
	api.use('/lists', lists({ config, gh }));

	// perhaps expose some API metadata at the root
	api.get('/', (req, res) => {
		res.json({ version });
	});

	return api;
}
