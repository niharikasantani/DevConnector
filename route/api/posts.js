const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const auth = require('../../middleware/auth');
const Posts = require('../../models/Posts');
const Profile = require('../../models/Profile');
const User = require('../../models/User');

// @route   POST api/posts
// @desc    Create a post
// @access  Private

router.post(
	'/',
	[auth, [check('text', 'Text is required').not().isEmpty()]],
	async (req, res) => {
		try {
			const errors = validationResult(req);
			if (!errors.isEmpty()) {
				return res.status(400).json({ errors: errors.array() });
			}
			const user = await User.findById(req.user.id).select('-password');

			const newPost = new Posts({
				text: req.body.text,
				name: user.name,
				avatar: user.avatar,
				user: req.user.id,
			});

			const post = await newPost.save();

			res.json(post);
		} catch (error) {
			console.error(error);
			res.status(500).send('Server error');
		}
	}
);

// @route   GET api/posts
// @desc    Get all posts
// @access  Private  -- keepingit private so that people sign up and sign in to view posts

router.get('/', auth, async (req, res) => {
	try {
		const posts = await Posts.find().sort({ date: -1 });
		res.json(posts);
	} catch (error) {
		console.error(error.message);
		res.status(500).send('Server error');
	}
});

// @route   GET api/posts/:id
// @desc    Get posts by id
// @access  Private

router.get('/:id', auth, async (req, res) => {
	try {
		const post = await Posts.findById(req.params.id);
		if (!post) {
			return res.status(404).json({ msg: 'Post not found' });
		}
		res.json(post);
	} catch (error) {
		console.error(error.message);
		if (error.kind === 'ObjectId') {
			return res.status(404).json({ msg: 'Post not found' });
		}
		res.status(500).send('Server error');
	}
}); /*----------------------------------------------------*/
/* ---------- Come back to this block later ----------------

// @route   GET api/posts/:user_id //self-coded
// @desc    Get posts of a user
// @access  Private

router.get('/user/:user_id', auth, async (req, res) => {
	try {
		const posts = await User.findById({ user: req.params.user_id.toString() });
		console.log(`req.params.user_id: ${req.params.user_id}`);
		console.log(`user: ${user}`);
		if (!posts) {
			console.log('if ! posts');
			return res.status(404).json({ msg: 'Posts not found' });
		}
		res.json(posts);
	} catch (error) {
		console.error(error.message);
		if (error.kind === 'ObjectId') {
			return res.status(404).json({ msg: 'Posts not found' });
		}
		res.status(500).send('Server error');
	}
});
*/

// @route   DELETE api/posts/:id
// @desc    Delete posts by id
// @access  Private

router.delete('/:id', auth, async (req, res) => {
	try {
		const post = await Posts.findById(req.params.id);

		if (!post) {
			return res.status(404).json({ msg: 'Post not found' });
		}

		//check if the post being deleted is that user's post

		if (post.user.toString() !== req.user.id) {
			return res.status(400).json({ msg: 'User not authorized' });
		}
		await post.remove();
		res.json({ msg: 'Post removed' });
	} catch (error) {
		console.error(error.message);
		if (error.kind === 'ObjectId') {
			return res.status(404).json({ msg: 'Post not found' });
		}
		res.status(500).send('Server error');
	}
});

// @route   PUT api/posts/like/:id
// @desc    Like a post
// @access  Private

router.put('/like/:id', auth, async (req, res) => {
	try {
		const post = await Posts.findById(req.params.id);

		//Check if the post has already been liked by that user

		if (
			post.likes.filter((like) => like.user.toString() === req.user.id).length >
			0
		) {
			return res.status(400).json({ msg: 'Post already liked' });
		}

		post.likes.unshift({ user: req.user.id });

		await post.save();

		res.json(post.likes);
	} catch (error) {
		console.error(error.message);
		res.status(500).send('server error');
	}
});

// @route   PUT api/posts/unlikelike/:id
// @desc    Unlike a post
// @access  Private

router.put('/unlike/:id', auth, async (req, res) => {
	try {
		const post = await Posts.findById(req.params.id);

		if (
			post.likes.filter((like) => like.user.toString() === req.user.id)
				.length === 0
		) {
			return res.status(400).json({ msg: 'Post has not yet been not liked' });
		}

		// get remove index

		const removeIndex = post.likes
			.map((like) => like.user.toString())
			.indexOf(req.user.id);

		post.likes.splice(removeIndex, 1);

		await post.save();
		res.json(post.likes);
	} catch (error) {
		console.error(error.message);
		res.status(500).send('Server error');
	}
});

// @route   POST api/posts/comment/:id
// @desc    Comment on a post
// @access  Private

router.post(
	'/comment/:id',
	[auth, [check('text', 'Text is required').not().isEmpty()]],
	async (req, res) => {
		try {
			const errors = validationResult(req);
			if (!errors.isEmpty()) {
				return res.status(400).json({ errors: errors.array() });
			}

			const user = await User.findById(req.user.id).select('-password');

			const post = await Posts.findById(req.params.id);

			const newComment = {
				text: req.body.text,
				name: user.name,
				avatar: user.avatar,
				user: req.user.id,
			};

			post.comments.unshift(newComment);
			await post.save();

			res.json(post);
		} catch (error) {
			console.error(error.message);
			res.status(500).send('Server error');
		}
	}
);

// @route   DELETE api/posts/comment/:id/:comment_id
// @desc    Delete a comment on a post
// @access  Private

router.delete('/comment/:id/:comment_id', auth, async (req, res) => {
	try {
		const post = await Posts.findById(req.params.id);
		//console.log(post);
		//const comment = post.comments.findById(req.params.comment_id);

		const comment = post.comments.find(
			(comment) => comment.id === req.params.comment_id
		);

		// Make sure the comment exists
		if (!comment) {
			return res.status(404).json({ msg: 'Comment doesnot exist' });
		}

		//Check if the user deleting the comment is the one logged in

		if (comment.user.toString() !== req.user.id) {
			return res.status(401).json({ msg: 'User not authorized' });
		}

		//get remove index

		const removeIndex = post.comments
			.map((comment) => comment.user.toString())
			.indexOf(req.user.id);

		post.comments.splice(removeIndex, 1);

		await post.save();

		res.json(post);
	} catch (error) {
		console.error(error.message);
		res.status(500).send('Server error');
	}
});

module.exports = router;
