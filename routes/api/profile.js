const express = require('express');
const router = express.Router();
const request = require('request');
const config = require('config');
const auth = require('../../middleware/auth');

const {check, validationResult} = require('express-validator'); 

const User = require('../../models/User');
const Profile = require('../../models/Profile');

// @route 	GET api/profile/me
// @desc	Get current users profile
// @access	Private
router.get('/me', auth, async (req, res) => {
	try {
		const profile = await Profile.findOne({ user: req.user.id})
									 .populate('user', ['name','avatar']);

		if(!profile) {
			return res.status(400).json({err: 'No Profile found'});
		}
		res.json(profile);

	} catch (err) {
		console.err(err.message);
		res.status(500).send('Server Error');
	}
});

// @route 	POST api/profile
// @desc	Update current users profile
// @access	Private
router.post(
	'/', 
	auth, 
	[ 
		check('status', 'Status is required')
			.not()
			.isEmpty(),
		check('skills', 'Skills are required')
			.not()
			.isEmpty()
	], 
	async (req, res) => {
		const errors = validationResult(req);
		if(!errors.isEmpty()) {
			return res.status(400).json({ errors: errors.array()});
		}

		// Validation Passed
    	const {
    		company,
      		website,
      		location,
      		bio,
      		status,
      		githubusername,
      		skills,
      		youtube,
      		twitter,
      		instagram,
      		linkedin,
      		facebook,
    	} = req.body;

    	// Build Profile Object
    	const profileFields = {};
    	profileFields.user = req.user.id;
    	if (company) profileFields.company = company;
    	if (website) profileFields.website = website;
    	if (location) profileFields.location = location;
    	if (bio) profileFields.bio = bio;
    	if (githubusername) profileFields.githubusername = githubusername;
    	profileFields.social = {};
    	if (youtube) profileFields.social.youtube = youtube;
    	if (twitter) profileFields.social.twitter = twitter;
    	if (instagram) profileFields.social.instagram = instagram;
    	if (linkedin) profileFields.social.linkedin = linkedin;
    	if (facebook) profileFields.social.facebook = facebook;
    	if (status) profileFields.status = status;
    	if (skills) profileFields.skills = skills.split(',').map(skill => skill.trim());

    	console.log(JSON.stringify(profileFields));

    	try {
    		let profile = await Profile.findOne({user: req.user.id});
    		if (profile) { // Profile found 
    			console.log (`Found Profile ${JSON.stringify(profile)}`);
    			profile = await Profile.findOneAndUpdate(
    				{ user: req.user.id},
    				{ $set: profileFields },
    				{ new: true }
    			);
    		} else {
    			// Create Profile
    			profile = new Profile(profileFields);
    			await profile.save();
    		}
    		return res.json(profile);
    	} catch (err) {
    		console.error(err);
    		res.status(400).send('Server Error');
    	}
	}
);

// @route 	GET api/profile/user
// @desc	Get all Profiles
// @access	Public
router.get('/', async (req, res) => {
	try {
		const profiles = await Profile.find().populate('user', ['name', 'avatar']);
		res.json (profiles);
	} catch (err) {
		console.error(err.message);
		res.status(500).send("Server Error");
	}
});

// @route 	GET api/profile/user/:user_id
// @desc	Get profile by ID
// @access	Public
router.get('/user/:user_id', async (req, res) => {
	try {
		const profile = await Profile.findOne({ user: req.params.user_id}).populate('user', ['name', 'avatar']);
		if (!profile) {
			return res.status(400).json({msg: 'Profile not found'});
		}
		res.json (profile);
	} catch (err) {
		console.error(err.message);
		if (err.kind == 'ObjectId') {
			return res.status(400).json({msg: 'Profile not found'});
		}
		res.status(500).send("Server Error");
	}
});

// @route 	DELETE api/profile
// @desc	Delete profile, user & posts
// @access	Private
router.delete('', auth, async (req, res) => {
	try {
		// Remove Profile
		// let efg = await Posts.findAndRemove({ user: req.user.id});
		let abc = await Profile.findOneAndRemove({ user: req.user.id});
		let def = await User.findOneAndRemove({ _id: req.user.id});
		if (def) {
			res.json ({msg: 'User Deleted'});
		} else {
			console.error("User does not exist");
			res.status(400).json({msg: 'No user to delete'});
		}
	} catch (err) {
		console.error(err.message);
		res.status(500).send("Server Error");
	}
});


// @route 	PUT api/profile/experience
// @desc	Add Profile Experience
// @access	Private
router.put(
	'/experience', 
	auth, 
	[ 
		check('title', 'Title is required')
			.not()
			.isEmpty(),
		check('company', 'Company is required')
			.not()
			.isEmpty(),
		check('from', 'From Date is required')
			.not()
			.isEmpty()
	], 
	async (req, res) => {
		const errors = validationResult(req);
		if(!errors.isEmpty()) {
			return res.status(400).json({ errors: errors.array()});
		}

		// Validation Passed
    	const {
    		title,
    		company,
    		location,
    		from,
    		to,
    		current,
    		description
    	} = req.body;

    	// Build Profile Object
    	const newExp = {};
    	newExp.user = req.user.id;
    	if (title) newExp.title = title;
    	if (company) newExp.company = company;
    	if (location) newExp.location = location;
    	if (from) newExp.from = from;
    	if (to) newExp.to = to;
    	if (current) newExp.current = current;
    	if (description) newExp.description = description;

    	console.log(JSON.stringify(newExp));

    	try {
    		let profile = await Profile.findOne({user: req.user.id});
    		if (profile) { // Profile found 
    			profile.experience.unshift(newExp);
    			profile = await profile.save();
    			console.log (`Updated Experience ${JSON.stringify(profile)}`);
    			return res.json(profile);
    		} else {
    			return res.status(400).json({"msg": 'User has no profile'});
    		}
    	} catch (err) {
    		console.error(err);
    		return res.status(500).send('Server Error');
    	}
	}
);

// @route 	DELETE api/profile/experience/:exp_id
// @desc	Delete Experience
// @access	Private
router.delete('/experience/:exp_id', auth, async (req, res) => {
	try {
		const profile = await Profile.findOne({ user: req.user.id});
		if (profile && profile.experience) {
			// Get Remove Index
			const getRemoveIndex = profile.experience.map(item => item.id).indexOf(req.params.exp_id);
			if (getRemoveIndex >= 0) {
				profile.experience.splice(getRemoveIndex, 1);
				await profile.save();
				return res.json ({msg: 'Experience Deleted'});
			} else {
				console.error("Cannot Delete Experience");
				return res.status(400).json({msg: 'No Experience to delete'});
			}
		} else {
			console.error("Cannot Delete Experience");
			res.status(400).json({msg: 'User has no Profile or Experience'});
		}
	} catch (err) {
		console.error(err.message);
		res.status(500).send("Server Error");
	}
});


// @route 	PUT api/profile/education
// @desc	Add Profile Education
// @access	Private
router.put(
	'/education', 
	auth, 
	[ 
		check('school', 'School is required')
			.not()
			.isEmpty(),
		check('degree', 'Degree is required')
			.not()
			.isEmpty(),
		check('fieldofstudy', 'Field of Study is required')
			.not()
			.isEmpty(),
		check('from', 'From Date is required')
			.not()
			.isEmpty()
	], 
	async (req, res) => {
		const errors = validationResult(req);
		if(!errors.isEmpty()) {
			return res.status(400).json({ errors: errors.array()});
		}

		// Validation Passed
    	const {
    		school,
    		degree,
    		fieldofstudy,
    		from,
    		to,
    		current,
    		description
    	} = req.body;

    	// Build Profile Object
    	const newEdu = {};
    	newEdu.user = req.user.id;
    	if (school) newEdu.school = school;
    	if (degree) newEdu.degree = degree;
    	if (fieldofstudy) newEdu.fieldofstudy = fieldofstudy;
    	if (from) newEdu.from = from;
    	if (to) newEdu.to = to;
    	if (current) newEdu.current = current;
    	if (description) newEdu.description = description;

    	console.log(JSON.stringify(newEdu));

    	try {
    		let profile = await Profile.findOne({user: req.user.id});
    		if (profile) { // Profile found 
    			profile.education.unshift(newEdu);
    			profile = await profile.save();
    			console.log (`Updated Education ${JSON.stringify(profile)}`);
    			return res.json(profile);
    		} else {
    			return res.status(400).json({"msg": 'User has no profile'});
    		}
    	} catch (err) {
    		console.error(err);
    		return res.status(500).send('Server Error');
    	}
	}
);

// @route 	DELETE api/profile/education/:edu_id
// @desc	Delete Education
// @access	Private
router.delete('/education/:edu_id', auth, async (req, res) => {
	try {
		const profile = await Profile.findOne({ user: req.user.id});
		if (profile && profile.experience) {
			// Get Remove Index
			const getRemoveIndex = profile.education.map(item => item.id).indexOf(req.params.edu_id);
			if (getRemoveIndex >= 0) {
				profile.education.splice(getRemoveIndex, 1);
				await profile.save();
				return res.json ({msg: 'Education Deleted'});
			} else {
				console.error("Cannot Delete Education");
				return res.status(400).json({msg: 'No Education to delete'});
			}
		} else {
			console.error("Cannot Delete Education");
			res.status(400).json({msg: 'User has no Profile or Education'});
		}
	} catch (err) {
		console.error(err.message);
		res.status(500).send("Server Error");
	}
});

// @route 	GET api/profile/github/:username
// @desc	Get user repos from Github
// @access	Public
router.get('/github/:username', async (req, res) => {
	try {
		const options = {
			uri: `https://api.github.com/users/${req.params.username}/repos?per_page=2&sort=created:asc&client_id=${config.get('githubClientId')}&client_secret=${config.get('githubSecret')}`,
				method: 'GET',
				headers: {'user-agent': 'node.js'}
		};
		console.log(options);
		request(options, (error, response, body) => {
			if (error) console.error(error);
			console.log(JSON.stringify(response));

			if (response.statusCode != 200) {
				return res.status(404).json({msg: 'No github profile found'});
			}

			res.json(JSON.parse(body));
		});
	} catch (err) {
		console.error(err.message);
		res.status(500).send('Server Error');
	}
});

module.exports = router;