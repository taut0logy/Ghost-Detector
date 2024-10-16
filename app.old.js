const express = require('express');
const multer = require('multer');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(bodyParser.json());

app.post('/detect', upload.single('image'), (req, res) => {
    const { latitude, longitude } = req.body;
    if (!req.file || !latitude || !longitude) {
        return res.status(400).json({ error: 'Image and location required' });
    }
    res.json({
        ghost_detected: true,
        ghost_type: 'Poltergeist',
        bounding_box: {
            x: 120,
            y: 80,
            width: 200,
            height: 200
        }
    });
});

app.get('/sightings', (req, res) => {
    const { latitude, longitude } = req.query;
    if (!latitude || !longitude) {
        return res.status(400).json({ error: 'Location required' });
    }
    res.json({
        sightings: [
            { ghost_type: 'Banshee', location: '13 Haunted Lane', time: '02:00 AM' },
            { ghost_type: 'Wraith', location: 'Old Cemetery', time: '03:15 AM' }
        ]
    });
});

app.get('/ghost-info', (req, res) => {
    const { ghost_type } = req.query;
    if (!ghost_type) {
        return res.status(400).json({ error: 'Ghost type required' });
    }
    res.json({
        ghost_type: 'Poltergeist',
        favorite_food: 'Cold pizza',
        favorite_time_of_night: '2:00 AM',
        typical_age: '300 years',
        origin: 'Medieval Europe',
        description: 'A mischievous spirit known for moving objects and causing trouble.'
    });
});

app.get('/users', (req, res) => {
    res.json({
        users: [
            { username: 'GhostHunter22', sightings_count: 5 },
            { username: 'SpookySeeker', sightings_count: 12 }
        ]
    });
});

app.post('/ghost/detect', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'Image required' });
    }
    res.json({
        human_detected: true,
        human_age: 29,
        human_identity: 'John Doe',
        spook_level: 'Terrified'
    });
});

app.get('/spook-level', (req, res) => {
    const { latitude, longitude } = req.query;
    if (!latitude || !longitude) {
        return res.status(400).json({ error: 'Location required' });
    }
    res.json({
        spook_level: 9,
        description: 'Extremely haunted. Watch your back!'
    });
});

app.get('/ghost/spooky-name', (req, res) => {
    res.json({
        spooky_name: 'The Shadow Whisperer'
    });
});

app.get('/ghost/sightings', (req, res) => {
    const { latitude, longitude } = req.query;
    if (!latitude || !longitude) {
        return res.status(400).json({ error: 'Location required' });
    }
    res.json({
        human_sightings: [
            { human_name: 'Jane Smith', location: 'Haunted Mansion', time: '10:00 PM' },
            { human_name: 'Bob the Builder', location: 'Spooky Forest', time: '11:45 PM' }
        ]
    });
});

app.get('/ghost/favorite-haunts', (req, res) => {
    res.json({
        favorite_haunts: [
            { location: 'Old Lighthouse', scares_given: 15 },
            { location: 'Abandoned Hospital', scares_given: 20 }
        ]
    });
});

app.post('/spirit-guide', (req, res) => {
    const { question } = req.body;
    if (!question) {
        return res.status(400).json({ error: 'Question required' });
    }
    res.json({
        answer: 'That’s a bad idea... trust me.'
    });
});

app.listen(3000, () => {
    console.log('Ghost-Detector API is running on port 3000');
});
