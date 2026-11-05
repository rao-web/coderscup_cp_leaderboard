import dotenv from 'dotenv';

dotenv.config();

const Authenticate = (req, res, next) => {
    const { key } = req.headers;
    // console.log('Authenticating request... Key: ', key);
    if (!key || process.env.KEY != key) {
        console.log('Authentication failed');
        return res.status(401).json({ msg: "not Authorization" });
    }

    next();
}

export default Authenticate;