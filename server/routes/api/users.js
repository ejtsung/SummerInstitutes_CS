const express = require('express');
const router = express.Router();
const gravatar = require('gravatar');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const validateLoginInput = require('../../validation/login');
const validateRegisterInput = require('../../validation/registration');


// @route GET api/posts/test
// @desc Tests posts route
// @access Public

const User = require('../../models/User');
const keys =require('../../config/keys');

router.get('/test', (req, res) => res.json({msg: "User works!"}));

router.post('/register', (req,res) => {
    // Validate the input data
    const { errors, isValid } = validateRegisterInput(req.body);
    // Check the validation
    if(!isValid) {
        return res.status(400).json(errors);
    }
    User.findOne({ email: req.body.email })
        .then(user => {
            if(user) {
                errors.email = 'Email already exists';
                return res.status(400).json(errors);
            } else {
                const avatar = gravatar.url(req.body.email, {
                    s: '200',   // size of image
                    r: 'pg',    // rating
                    d: 'mm'     // default image
                });
                const newUser = new User({
                    name: req.body.name,
                    email: req.body.email,
                    avatar: avatar,
                    password: req.body.password
                });

                bcrypt.genSalt(10, (err, salt) => {
                    bcrypt.hash(newUser.password, salt, (err, hash) => {
                        if(err) throw err;
                        newUser.password = hash;
                        newUser.save()
                            .then(user => res.json(user))
                            .catch(err => console.log(err));
                    })
                });
            }
        })
});

router.post('/login', (req,res) => {
    const { errors, isValid } = validateLoginInput(req.body);

    // Check Validation
    if (!isValid) {
        return res.status(400).json(errors);
    }

    const email = req.body.email;
    const password = req.body.password;

    // Find user by email
    User.findOne({ email: email })
        .then(user => {
            // Check for user
            if(!user) {
                errors.email = 'User not found';
                return res.status(404).json(errors);
            }
            // Check password
            bcrypt.compare(password, user.password)
                .then(isMatch => {
                    if(isMatch) {
                        // User match
                        // Create payload for JWT
                        const payload = { id: user.id, name: user.name, avatar: user.avatar };
                        // sign token
                        jwt.sign(
                            payload,
                            keys.secretOrKey,
                            { expiresIn: 36000 },
                            (err, token) => {
                                res.json({
                                    success: true,
                                    token: 'Bearer ' + token
                                });
                            });
                       //res.json({msg:"success"});
                    } else {
                        errors.password = 'Password invalid';
                        return res.status(400).json(errors);
                    }
                });
        });
});

router.get('/current', passport.authenticate('jwt', { session:false }), (req, res) => {
    res.json({
        id: req.user.id,
        name: req.user.name,
        email: req.user.email
    });
});

module.exports = router;