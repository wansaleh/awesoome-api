import github from 'octonode';
import { token } from '../github.json'

export default callback => {
	// const gh = github.client(token);

	// gh.requestDefaults.headers['Accept'] = 'application/vnd.github.v3.html';

	callback(null);
}
