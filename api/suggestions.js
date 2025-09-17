// Example implementation using Vercel Serverless Functions
// api/suggestions.js

import { createHash } from 'crypto';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import { writeFile } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Webhook URL should be in environment variables
const DISCORD_WEBHOOK_URL = process.env.DISCORD_SUGGESTIONS_WEBHOOK;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// Rate limiting setup
const limiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // 5 requests per hour
    message: { error: 'Too many requests, please try again later.' }
});

// File upload configuration
const upload = multer({
    limits: {
        fileSize: MAX_FILE_SIZE
    },
    fileFilter: (req, file, cb) => {
        if (ALLOWED_FILE_TYPES.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type'));
        }
    }
});

// Utility function to sanitize text
function sanitizeText(text) {
    return text
        .replace(/`/g, '\\`')
        .replace(/\*/g, '\\*')
        .replace(/_/g, '\\_')
        .replace(/~/g, '\\~')
        .substring(0, 3000);
}

// Generate a unique submission ID
function generateSubmissionId() {
    return createHash('sha256')
        .update(uuidv4())
        .digest('hex')
        .substring(0, 8);
}

// Format the Discord embed
function formatDiscordEmbed(data, submissionId, attachmentUrl = null) {
    const colors = {
        High: 0xE53E3E,
        Medium: 0xF6C244,
        Low: 0x38A169
    };

    const embed = {
        title: `New Suggestion — ${data.category} — ${data.priority}`,
        color: colors[data.priority] || colors.Medium,
        fields: [
            {
                name: 'Name',
                value: data.name || 'Anonymous',
                inline: true
            },
            {
                name: 'Email',
                value: data.email || '—',
                inline: true
            },
            {
                name: 'Category',
                value: data.category,
                inline: true
            },
            {
                name: 'Priority',
                value: data.priority,
                inline: true
            }
        ],
        description: data.suggestion.length > 1200
            ? data.suggestion.substring(0, 1200) + '... *(full text attached)*'
            : data.suggestion,
        timestamp: new Date().toISOString(),
        footer: {
            text: `App v1.0.0 | ID: ${submissionId}`
        }
    };

    if (attachmentUrl) {
        embed.image = { url: attachmentUrl };
    }

    return embed;
}

// Handle file upload and Discord webhook
async function handleDiscordWebhook(data, file = null) {
    const submissionId = generateSubmissionId();
    const payload = { embeds: [formatDiscordEmbed(data, submissionId)] };

    // If we have a long suggestion, attach it as a file
    if (data.suggestion.length > 1200) {
        const fullText = `Full Suggestion (ID: ${submissionId})\n\n${data.suggestion}`;
        payload.files = [{
            name: 'full-suggestion.txt',
            content: Buffer.from(fullText).toString('base64')
        }];
    }

    // If we have an image, save it temporarily and attach to Discord
    if (file) {
        const ext = file.originalname.split('.').pop();
        const filename = `${submissionId}.${ext}`;
        const filePath = path.join('/tmp', filename);
        
        await writeFile(filePath, file.buffer);
        payload.files = [...(payload.files || []), {
            name: filename,
            content: file.buffer.toString('base64')
        }];
    }

    // Send to Discord
    const response = await fetch(DISCORD_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        throw new Error('Failed to forward to Discord');
    }

    return submissionId;
}

// Main handler
export default async function handler(req, res) {
    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Apply rate limiting
        await limiter(req, res);

        // Parse multipart form data
        await upload.single('file')(req, res);

        const {
            name,
            email,
            category,
            priority,
            suggestion,
            consent,
            clientMetadata,
            'bot-field': honeypot
        } = req.body;

        // Check honeypot
        if (honeypot) {
            return res.status(400).json({ error: 'Invalid submission' });
        }

        // Validate required fields
        if (!category || !priority || !suggestion || suggestion.length < 10) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Validate email format if provided
        if (email && !/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        // Clean and prepare data
        const cleanData = {
            name: sanitizeText(name || ''),
            email: email || '',
            category: sanitizeText(category),
            priority,
            suggestion: sanitizeText(suggestion),
            consent: consent === 'true',
            metadata: clientMetadata ? JSON.parse(clientMetadata) : {}
        };

        // Forward to Discord
        const submissionId = await handleDiscordWebhook(cleanData, req.file);

        // Log the event
        console.log(`Suggestion ${submissionId} submitted successfully`);

        return res.status(200).json({
            status: 'ok',
            submissionId,
            forwarded: true
        });

    } catch (error) {
        console.error('Error processing suggestion:', error);

        // If this was a Discord webhook failure, try once more
        if (error.message === 'Failed to forward to Discord') {
            try {
                await handleDiscordWebhook(req.body, req.file);
            } catch (retryError) {
                console.error('Retry failed:', retryError);
                return res.status(500).json({
                    error: 'Failed to process suggestion'
                });
            }
        }

        return res.status(500).json({
            error: 'Server error processing suggestion'
        });
    }
}
