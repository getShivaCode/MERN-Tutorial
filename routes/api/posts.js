const express = require('express');
const router = express.Router();
const gravatar = require('gravatar');
const config = require('config');
const auth = require('../../middleware/auth');

const User = require('../../models/User');
const Post = require('../../models/Posts');
const Profile = require('../../models/Profile');

const {check, validationResult} = require('express-validator');

// @route 	POST api/posts
// @desc	Create a post
// @access	Private
router.post(
	'/', 
	auth,
	[
		check('text', 'Text is required')
			.not()
			.isEmpty()
	],
	async (req, res) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()){
			return res.status(400).json({errors: errors.array() });
		}
	
		try {
			const user = await User.findById(req.user.id).select('-password');
			console.log(`Found user ${JSON.stringify(user)}`);
			const newPost = new Post ({
				text: req.body.text,
				name: user.name,
				avatar: user.avatar,
				user: req.user.id
			});
			const post = await newPost.save();
			console.log(`New post created ${JSON.stringify(post)}`);
			res.json(post);
		} catch (err) {
			console.error(err.message);
			return res.status(500).send('Server Error');
		}
	}
);


// @route 	GET api/posts
// @desc	Get all posts
// @access	Private
router.get('/', auth, async (req, res) => {
	try {
		const posts = await Post.find().sort({date: -1});
		res.json (posts);
	} catch (err) {
		console.error(err.message);
		res.status(500).send("Server Error");
	}
});

// @route 	GET api/posts/:post_id
// @desc	Get post by ID
// @access	Private
router.get('/:post_id', auth, async (req, res) => {
	try {
		const post = await Post.findById(req.params.post_id);
		if (!post) {
			return res.status(404).json({msg: 'Post not found'});
		}
		res.json (post);
	} catch (err) {
		console.error(err.message);
		if (err.kind == 'ObjectId') {
			return res.status(404).json({msg: 'Post not found'});
		}
		res.status(500).send("Server Error");
	}
});

// @route 	DELETE api/posts/:post_id
// @desc	Delete a post
// @access	Private
router.delete('/:post_id', auth, async (req, res) => {
	try {
		const post = await Post.findById(req.params.post_id);
		// Check on User
		if(!post || post.user.toString() !== req.user.id) {
			console.error("User not authorized");
			return res.status(401).json({msg: 'User Not Authorized'});
		}
		let abc = await Post.findOneAndRemove({ _id: req.params.post_id});
		if (abc) {
			res.json ({msg: 'Post Deleted'});
		} else {
			console.error("Post does not exist");
			res.status(400).json({msg: 'No post to delete'});
		}
	} catch (err) {
		console.error(err.message);
		if (err.kind == 'ObjectId') {
			return res.status(404).json({msg: 'Post not found'});
		}
		res.status(500).send("Server Error");
	}
});

// @route 	PUT api/posts/like/:post_id
// @desc	Add Profile Experience
// @access	Private
router.put(
	'/like/:post_id', 
	auth, 
	async (req, res) => {
		try {
			let post = await Post.findById(req.params.post_id);
			// Check if Post has already been liked by User
			if (!(post && post.likes)) {
				// return if posts not found
				return res.status(404).json({msg: 'Post not found'});
			}
			/*
			if (post.user.toString() === req.user.id) {
				// You cant like your own post!
				return res.status(400).json({msg: 'You cant like your own post'});
	
			}*/
			console.log(`Post is ${JSON.stringify(post)}`);
			if ((post.likes.filter(like => like.user.toString() === req.user.id)).length > 0) {
				// Is Post already liked by the user
				return res.status(400).json({msg: 'Post already liked'});
			} 
	
			// Add like to Post
			post.likes.unshift({user: req.user.id});
			post = await post.save();
			console.log (`Updated Likes ${JSON.stringify(post)}`);
    		return res.json(post.likes);
    	} catch (err) {
    		if (err.kind == 'ObjectId') {
    			console.log(`ObjectID is not formatted ${req.params.post_id}`);
				return res.status(404).json({msg: 'Post not found'});
			}
			console.error(err);
    		return res.status(500).send('Server Error');
    	}
	}
);

// @route 	PUT api/posts/unlike/:post_id
// @desc	Add Profile Experience
// @access	Private
router.put(
	'/unlike/:post_id', 
	auth, 
	async (req, res) => {
		try {
			let post = await Post.findById(req.params.post_id);
			// Check if Post has already been liked by User
			if (!(post && post.likes)) {
				// return if posts not found
				return res.status(404).json({msg: 'Post not found'});
			}
			console.log(`Post is ${JSON.stringify(post)}`);
			if ((post.likes.filter(like => like.user.toString() === req.user.id)).length === 0) {
				// Is Post already liked by the user
				return res.status(400).json({msg: 'Post not yet been liked'});
			} 
	
			// Remove like to Post
			const removeIndex = post.likes.map(like => like.user.toString().indexOf(req.user.id));
			post.likes.splice(removeIndex,1);
			post = await post.save();
			console.log (`Updated Likes ${JSON.stringify(post)}`);
    		return res.json(post.likes);
    	} catch (err) {
    		if (err.kind == 'ObjectId') {
    			console.log(`ObjectID is not formatted ${req.params.post_id}`);
				return res.status(404).json({msg: 'Post not found'});
			}
			console.error(err);
    		return res.status(500).send('Server Error');
    	}
	}
);

// @route 	POST api/posts/comment/:post_id
// @desc	Comment on a post
// @access	Private
router.post(
	'/comment/:post_id', 
	auth,
	[
		check('text', 'Text is required')
			.not()
			.isEmpty()
	],
	async (req, res) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()){
			return res.status(400).json({errors: errors.array() });
		}
	
		try {
			const user = await User.findById(req.user.id).select('-password');
			console.log(`Found user ${JSON.stringify(user)}`);

			let post = await Post.findById(req.params.post_id);
			if (!(post && post.comments)) {
				// return if posts not found
				return res.status(404).json({msg: 'Post not found'});
			}
			
			console.log(`Post is ${JSON.stringify(post)}`);

			const newComment = {
				text: req.body.text,
				name: user.name,
				avatar: user.avatar,
				user: req.user.id
			};

			post.comments.unshift(newComment);
			post = await post.save();
			console.log(`New Comment created ${JSON.stringify(post)}`);
			res.json(post.comments);
		} catch (err) {
			if (err.kind == 'ObjectId') {
    			console.log(`ObjectID is not formatted ${req.params.post_id}`);
				return res.status(404).json({msg: 'Post not found'});
			}
			console.error(err.message);
			return res.status(500).send('Server Error');
		}
	}
);

// @route 	DELETE api/posts/comment/:post_id/:comment_id
// @desc	Delete Comment on a post
// @access	Private
router.delete(
	'/comment/:post_id/:comment_id', 
	auth,
	async (req, res) => {
		try {
			let post = await Post.findById(req.params.post_id);
			// Check if Post has already been liked by User
			if (!(post && post.comments)) {
				// return if posts not found
				return res.status(404).json({msg: 'Post not found'});
			}
			
			console.log(`Post is ${JSON.stringify(post)}`);

			const comment = post.comments.find(comment => comment.id === req.params.comment_id);

			if (!comment) {
				// Is Comment found
				return res.status(404).json({msg: 'Comment not found'});
			} 
			// Is user allowed to delete comment

			if (comment.user.toString() !== req.user.id) {
				return res.status(401).json({msg: 'Not Authorized to delete comment'});
			}
			// Remove Comment to Post
			const removeIndex = post.comments.map(comment => comment.id.toString().indexOf(req.params.comment_id));
			post.comments.splice(removeIndex, 1);
			post = await post.save();
			console.log (`Updated Comments ${JSON.stringify(post)}`);
    		return res.json(post.comments);
		} catch (err) {
			if (err.kind == 'ObjectId') {
    			console.log(`ObjectID is not formatted ${req.params.post_id}`);
				return res.status(404).json({msg: 'Post not found'});
			}
			console.error(err.message);
			return res.status(500).send('Server Error');
		}
	}
);

module.exports = router;