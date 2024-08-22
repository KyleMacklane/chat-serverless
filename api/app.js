const { signup, login } = require('./controllers/auth.js');
const cors = require('cors');
const dotenv = require('dotenv');
const twilio = require('twilio');

// Load environment variables
dotenv.config();

// Twilio client setup
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
const twilioClient = twilio(accountSid, authToken);

// Middleware
const corsMiddleware = cors();
const jsonMiddleware = (req, res, next) => {
    if (req.headers['content-type'] === 'application/json') {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
            req.body = JSON.parse(body);
            next();
        });
    } else {
        next();
    }
};

// Main handler function
module.exports = async (req, res) => {
    corsMiddleware(req, res, async () => {
        jsonMiddleware(req, res, async () => {
            // Handle /auth/signup route
            if (req.method === 'POST' && req.url === '/api/auth/signup') {
                return signup(req, res);
            }

            // Handle /auth/login route
            if (req.method === 'POST' && req.url === '/api/auth/login') {
                return login(req, res);
            }

            // Handle the main route for Twilio messaging
            if (req.method === 'POST' && req.url === '/api') {
                const { message, user: sender, type, members } = req.body;

                if (type === 'message.new') {
                    members
                        .filter((member) => member.user_id !== sender.id)
                        .forEach(({ user }) => {
                            if (!user.online) {
                                twilioClient.messages.create({
                                    body: `You have a new message from ${message.user.fullName} - ${message.text}`,
                                    messagingServiceSid: messagingServiceSid,
                                    to: user.phoneNumber,
                                })
                                .then(() => console.log('Message sent!'))
                                .catch((err) => console.log('Twilio Error:', err));
                            }
                        });

                    return res.status(200).send('Message sent!');
                }

                return res.status(200).send('Not a new message request');
            }

            // Default response for unhandled routes
            res.status(404).send('Not Found');
        });
    });
};
