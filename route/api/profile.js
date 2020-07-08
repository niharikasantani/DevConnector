const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const profile = require('../../models/Profile');
const user = require('../../models/User');
const { check, validationResult } = require('express-validator');
const Profile = require('../../models/Profile');
const User = require('../../models/User');
const Post = require('../../models/Posts');
const request = require('request');
const config = require('config');
const axios = require('axios');
const normalize = require('normalize-url');

// @route   GET api/profile/me
// @desc    Get current user's profile
// @access  Private
router.get('/me', auth, async (req, res) => {
	try {
		// user pertains to the user field in Profile model which fetches the User oobject by ID
		const profile = await Profile.findOne({
			user: req.user.id,
		}).populate('user', ['name', 'avatar']);

		if (!profile) {
			return res
				.status(400)
				.json({ msg: 'There is no profile for this user' });
		}

		res.json(profile);
	} catch (error) {
		console.error(error.message);
		res.status(500).send('Server error');
	}
});

// @route   POST api/profile
// @desc    Create/ update a user profile
// @access  Private

router.post(
	'/',
	[
		auth,
		[
			check('status', 'Status is required').not().isEmpty(),
			check('skills', 'Skills are required').not().isEmpty(),
		],
	],
	async (req, res) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(400).json({ errors: errors.array() });
		}

		const {
			company,
			website,
			location,
			bio,
			status,
			githubusername,
			skills,
			youtube,
			facebook,
			twitter,
			instagram,
			linkedin,
		} = req.body;

		// Build profile object
		// const profileFields = {};
		// profileFields.user = req.user.id;
		// if (company) profileFields.company = company;
		// if (website) profileFields.website = website;
		// if (location) profileFields.location = location;
		// if (bio) profileFields.bio = bio;
		// if (status) profileFields.status = status;
		// if (githubusername) profileFields.githubusername = githubusername;

		// if (skills) {
		// 	Array.isArray(skills)
		// 		? skills
		// 		: skills.split(',').map((skill) => ' ' + skill.trim());

		// 	//profileFields.skills = skills.split(',').map((skill) => skill.trim());
		// }

		const profileFields = {
			user: req.user.id,
			company,
			location,
			website:
				website && website !== ''
					? normalize(website, { forceHttps: true })
					: '',
			bio,
			skills: Array.isArray(skills)
				? skills
				: skills.split(',').map((skill) => ' ' + skill.trim()),
			status,
			githubusername,
		};

		//Build social object

		// profileFields.social = {};

		// if (youtube) profileFields.social.youtube = youtube;
		// if (twitter) profileFields.social.twitter = twitter;
		// if (facebook) profileFields.social.facebook = facebook;
		// if (linkedin) profileFields.social.linkedin = linkedin;
		// if (instagram) profileFields.social.instagram = instagram;

		const socialFields = {
			youtube,
			twitter,
			instagram,
			linkedin,
			facebook,
		};
		for (const [key, value] of Object.entries(socialFields)) {
			if (value && value.length > 0)
				socialFields[key] = normalize(value, { forceHttps: true });
		}
		profileFields.social = socialFields;

		try {
			let profile = await Profile.findOneAndUpdate(
				{ user: req.user.id },
				{ $set: profileFields },
				{ new: true, upsert: true }
				//{ useFindAndModify: false }
			);

			res.json(profile);
		} catch (error) {
			console.error(error.message);
			res.status(500).send('Server error');
		}
	}
);

// @route   GET api/profile
// @desc    Get all profiles
// @access  Public

router.get('/', async (req, res) => {
	try {
		const profiles = await Profile.find().populate('user', [
			'name',
			'avatar',
		]);
		res.json(profiles);
	} catch (error) {
		console.error(error.message);
		res.status(500).send('server error');
	}
});

// @route   GET api/profile/user/:user_id
// @desc    Get profile by user_id
// @access  Public

router.get('/user/:user_id', async (req, res) => {
	try {
		const profile = await Profile.findOne({
			user: req.params.user_id,
		}).populate('user', ['name', 'avatar']);

		if (!profile) {
			return res
				.status(400)
				.json({ msg: 'There is no profile for this user' });
		}

		res.json(profile);
	} catch (error) {
		console.error(error.message);
		if (error.kind == 'ObjectId') {
			return res
				.status(400)
				.json({ msg: 'There is no profile for this user' });
		}
		res.status(500).send('server error');
	}
});

// @route   DELETE api/profile
// @desc    Delete profile, user & posts
// @access  Private

router.delete('/', auth, async (req, res) => {
	try {
		// @todo: remove user's posts
		// remove posts
		await Post.deleteMany({
			user: req.user.id,
		});
		//remove profile
		await Profile.findOneAndRemove(
			{ user: req.user.id }
			//	{ useFindAndModify: false }
		);
		//remove user
		await User.findOneAndRemove(
			{ _id: req.user.id }
			//	{ useFindAndModify: false }
		);

		res.json({ msg: 'User deleted' });
	} catch (error) {
		console.error(error.message);
		res.status(500).send('Server error');
	}
});

// @route   PUT api/profile/experience
// @desc    Add profile experience
// @access  Private

router.put(
	'/experience',
	[
		auth,
		[
			check('title', 'Title is required').not().isEmpty(),
			check('company', 'Company is required').not().isEmpty(),
			check('from', 'From Date is required').not().isEmpty(),
		],
	],
	async (req, res) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(400).json({ errors: errors.array() });
		}

		const {
			title,
			company,
			location,
			from,
			to,
			current,
			description,
		} = req.body;

		const newExp = {
			title,
			company,
			location,
			from,
			to,
			current,
			description,
		};

		try {
			const profile = await Profile.findOne({ user: req.user.id });

			//unshift pushes to the beginning of the array unlike push which adds to the end of the array
			profile.experience.unshift(newExp);
			await profile.save();

			res.json(profile);
		} catch (error) {
			console.error(error.message);
			res.status(500).send('Server error');
		}
	}
);

// @route   DELETE api/profile/experience/:exp_id
// @desc    Delete experience from profile
// @access  Private

router.delete('/experience/:exp_id', auth, async (req, res) => {
	try {
		const foundProfile = await Profile.findOne({ user: req.user.id });

		//Get the index of the experience to remove

		foundProfile.experience = foundProfile.experience.filter(
			(exp) => exp._id.toString() !== req.params.exp_id
		);

		await foundProfile.save();
		return res.status(200).json(foundProfile);
	} catch (error) {
		console.error(error.message);
		return res.status(500).json({ msg: 'Server error' });
	}
});

// @route   PUT api/profile/education
// @desc    Add profile education
// @access  Private

router.put(
	'/education',
	[
		auth,
		[
			check('school', 'School is required').not().isEmpty(),
			check('degree', 'Degree is required').not().isEmpty(),
			check('fieldofstudy', 'Field of study is required').not().isEmpty(),
			check('from', 'From Date is required').not().isEmpty(),
		],
	],
	async (req, res) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(400).json({ errors: errors.array() });
		}

		const {
			school,
			degree,
			fieldofstudy,
			from,
			to,
			current,
			description,
		} = req.body;

		const newEdu = {
			school,
			degree,
			fieldofstudy,
			from,
			to,
			current,
			description,
		};

		try {
			const profile = await Profile.findOne({ user: req.user.id });

			//unshift pushes to the beginning of the array unlike push which adds to the end of the array
			profile.education.unshift(newEdu);
			await profile.save();

			res.json(profile);
		} catch (error) {
			console.error(error.message);
			res.status(500).send('Server error');
		}
	}
);

// @route   DELETE api/profile/education/:edu_id
// @desc    Delete education from profile
// @access  Private

// router.delete('/education/:edu_id', auth, async (req, res) => {
// 	try {
// 		const profile = await Profile.findOne({ user: req.user.id });

// 		//Get the index of the education to remove

// 		const removeIndex = profile.education
// 			.map((item) => item.id)
// 			.indexOf(req.params.edu_id);

// 		profile.education.splice(removeIndex, 1);

// 		await profile.save();
// 		res.json(profile);
// 	} catch (error) {
// 		console.error(error.message);
// 		res.status(500).send('Server error');
// 	}
// });

router.delete('/education/:edu_id', auth, async (req, res) => {
	try {
		const foundProfile = await Profile.findOne({ user: req.user.id });
		const eduIds = foundProfile.education.map((edu) => edu._id.toString());

		const removeIndex = eduIds.indexOf(req.params.edu_id);
		if (removeIndex === -1) {
			return res.status(500).json({ msg: 'Server error' });
		} else {
			foundProfile.education.splice(removeIndex, 1);
			await foundProfile.save();
			return res.status(200).json(foundProfile);
		}
	} catch (error) {
		console.error(error);
		return res.status(500).json({ msg: 'Server error' });
	}
});

// @route   GET api/profile/github/:username
// @desc    Get repositories by github username
// @access  Public

router.get('/github/:username', async (req, res) => {
	try {
		const uri = encodeURI(
			`https://api.github.com/users/${req.params.username}/repos?per_page=5&sort=created:asc`
		);

		const headers = {
			'user-agent': 'node.js',
			//Authorization: `token ${config.get('githubToken')}`,
		};

		const githubResponse = await axios.get(uri, { headers });
		return res.json(githubResponse.data);

		if (!githubResponse) {
			return res.status(404).json({ msg: 'No Github profile found' });
		}
	} catch (error) {
		console.error(error.message);
		res.status(404).json({ msg: 'No Github profile found' });
	}
});

module.exports = router;
