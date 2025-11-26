"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const router = (0, express_1.Router)();
/**
 * GET /api/mobile/calendar/posters/:date
 * Get posters for a specific date (YYYY-MM-DD format)
 *
 * This endpoint fetches calendar posters for a specific date.
 * It can work with:
 * 1. CalendarPoster model (if exists) - filters by date field
 * 2. Image model - filters by tags containing the date or festival name
 * 3. mobile_templates model - filters by tags containing the date
 */
router.get('/posters/:date', async (req, res) => {
    try {
        const { date } = req.params;
        // Validate date format (YYYY-MM-DD)
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(date)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid date format. Expected YYYY-MM-DD',
                message: 'Date must be in YYYY-MM-DD format'
            });
        }
        console.log('📅 [CALENDAR API] Fetching posters for date:', date);
        const posters = [];
        // Try to fetch from CalendarPoster model first (if it exists in database)
        try {
            // Check if CalendarPoster model exists by trying to query it
            const calendarPosters = await prisma.calendarPoster?.findMany({
                where: {
                    AND: [
                        { isActive: true },
                        { date: date }
                    ]
                },
                orderBy: { createdAt: 'desc' }
            });
            if (calendarPosters && Array.isArray(calendarPosters)) {
                const formattedPosters = calendarPosters.map((poster) => ({
                    id: poster.id,
                    name: poster.name,
                    title: poster.title || poster.name,
                    description: poster.description || '',
                    thumbnailUrl: poster.thumbnailUrl,
                    imageUrl: poster.imageUrl,
                    category: poster.category || 'Festival',
                    downloads: poster.downloads || 0,
                    isDownloaded: false,
                    tags: poster.tags ? poster.tags.split(',').map((tag) => tag.trim()) : [],
                    date: poster.date,
                    festivalName: poster.festivalName,
                    festivalEmoji: poster.festivalEmoji,
                    createdAt: poster.createdAt.toISOString(),
                    updatedAt: poster.updatedAt.toISOString()
                }));
                posters.push(...formattedPosters);
                console.log(`✅ [CALENDAR API] Found ${formattedPosters.length} poster(s) from CalendarPoster model`);
            }
        }
        catch (error) {
            // CalendarPoster model might not exist yet, that's okay
            if (!error.message?.includes('model') && !error.message?.includes('does not exist')) {
                console.error('⚠️ [CALENDAR API] Error fetching from CalendarPoster model:', error);
            }
        }
        // Fetch from Image model where tags contain the date or category is FESTIVAL
        try {
            const images = await prisma.image.findMany({
                where: {
                    AND: [
                        { isActive: true },
                        { approvalStatus: 'APPROVED' },
                        {
                            OR: [
                                { tags: { contains: date } },
                                { category: 'FESTIVAL' },
                                { category: 'CALENDAR' }
                            ]
                        }
                    ]
                },
                orderBy: { createdAt: 'desc' },
                take: 50
            });
            // Convert images to calendar poster format
            const imagePosters = images.map((image) => ({
                id: image.id,
                name: image.title,
                title: image.title,
                description: image.description || '',
                thumbnailUrl: image.thumbnailUrl || image.url,
                imageUrl: image.url,
                category: image.category || 'Festival',
                downloads: image.downloads || 0,
                isDownloaded: false, // This would need to be checked against user downloads
                tags: image.tags ? image.tags.split(',').map((tag) => tag.trim()) : [],
                date: date,
                createdAt: image.createdAt.toISOString(),
                updatedAt: image.updatedAt.toISOString()
            }));
            posters.push(...imagePosters);
        }
        catch (error) {
            console.error('⚠️ [CALENDAR API] Error fetching from Image model:', error);
        }
        // Fetch from mobile_templates model
        try {
            const templates = await prisma.mobile_templates.findMany({
                where: {
                    AND: [
                        { isActive: true },
                        {
                            OR: [
                                { tags: { contains: date } },
                                { category: 'FESTIVAL' },
                                { category: 'CALENDAR' }
                            ]
                        }
                    ]
                },
                orderBy: { createdAt: 'desc' },
                take: 50
            });
            // Convert templates to calendar poster format
            const templatePosters = templates.map((template) => ({
                id: template.id,
                name: template.title,
                title: template.title,
                description: template.description || '',
                thumbnailUrl: template.thumbnailUrl || template.imageUrl,
                imageUrl: template.imageUrl,
                category: template.category || 'Festival',
                downloads: template.downloads || 0,
                isDownloaded: false,
                tags: template.tags ? template.tags.split(',').map((tag) => tag.trim()) : [],
                date: date,
                createdAt: template.createdAt.toISOString(),
                updatedAt: template.updatedAt.toISOString()
            }));
            posters.push(...templatePosters);
        }
        catch (error) {
            console.error('⚠️ [CALENDAR API] Error fetching from mobile_templates model:', error);
        }
        // Remove duplicates based on ID
        const uniquePosters = posters.filter((poster, index, self) => index === self.findIndex((p) => p.id === poster.id));
        console.log(`✅ [CALENDAR API] Found ${uniquePosters.length} poster(s) for date: ${date}`);
        res.json({
            success: true,
            data: {
                posters: uniquePosters,
                date,
                total: uniquePosters.length
            },
            message: `Posters for ${date} fetched successfully`
        });
    }
    catch (error) {
        console.error('❌ [CALENDAR API] Error fetching posters by date:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch posters',
            message: error.message || 'Internal server error'
        });
    }
});
/**
 * GET /api/mobile/calendar/posters/month/:year/:month
 * Get all posters for a specific month
 *
 * Returns posters grouped by date for the entire month
 */
router.get('/posters/month/:year/:month', async (req, res) => {
    try {
        const year = parseInt(req.params.year, 10);
        const month = parseInt(req.params.month, 10);
        // Validate year and month
        if (isNaN(year) || year < 2020 || year > 2100) {
            return res.status(400).json({
                success: false,
                error: 'Invalid year. Expected year between 2020-2100',
                message: 'Year must be between 2020 and 2100'
            });
        }
        if (isNaN(month) || month < 1 || month > 12) {
            return res.status(400).json({
                success: false,
                error: 'Invalid month. Expected month between 1-12',
                message: 'Month must be between 1 and 12'
            });
        }
        console.log(`📅 [CALENDAR API] Fetching posters for month: ${year}-${month}`);
        // Get all dates in the month
        const daysInMonth = new Date(year, month, 0).getDate();
        const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
        const monthEnd = `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
        const postersByDate = {};
        // Try to fetch from CalendarPoster model first (if it exists in database)
        try {
            const calendarPosters = await prisma.calendarPoster?.findMany({
                where: {
                    AND: [
                        { isActive: true },
                        {
                            date: {
                                gte: monthStart,
                                lte: monthEnd
                            }
                        }
                    ]
                },
                orderBy: { createdAt: 'desc' }
            });
            if (calendarPosters && Array.isArray(calendarPosters)) {
                calendarPosters.forEach((poster) => {
                    if (!postersByDate[poster.date]) {
                        postersByDate[poster.date] = [];
                    }
                    postersByDate[poster.date].push({
                        id: poster.id,
                        name: poster.name,
                        title: poster.title || poster.name,
                        description: poster.description || '',
                        thumbnailUrl: poster.thumbnailUrl,
                        imageUrl: poster.imageUrl,
                        category: poster.category || 'Festival',
                        downloads: poster.downloads || 0,
                        isDownloaded: false,
                        tags: poster.tags ? poster.tags.split(',').map((tag) => tag.trim()) : [],
                        date: poster.date,
                        festivalName: poster.festivalName,
                        festivalEmoji: poster.festivalEmoji,
                        createdAt: poster.createdAt.toISOString(),
                        updatedAt: poster.updatedAt.toISOString()
                    });
                });
                console.log(`✅ [CALENDAR API] Found ${calendarPosters.length} poster(s) from CalendarPoster model`);
            }
        }
        catch (error) {
            // CalendarPoster model might not exist yet, that's okay
            if (!error.message?.includes('model') && !error.message?.includes('does not exist')) {
                console.error('⚠️ [CALENDAR API] Error fetching from CalendarPoster model:', error);
            }
        }
        // Fetch from Image model
        try {
            const images = await prisma.image.findMany({
                where: {
                    AND: [
                        { isActive: true },
                        { approvalStatus: 'APPROVED' },
                        {
                            OR: [
                                { category: 'FESTIVAL' },
                                { category: 'CALENDAR' },
                                {
                                    tags: {
                                        contains: `${year}-${String(month).padStart(2, '0')}`
                                    }
                                }
                            ]
                        }
                    ]
                },
                orderBy: { createdAt: 'desc' },
                take: 200
            });
            // Group images by date from tags
            images.forEach((image) => {
                if (image.tags) {
                    const tags = image.tags.split(',').map((tag) => tag.trim());
                    tags.forEach((tag) => {
                        // Check if tag matches date format YYYY-MM-DD
                        const dateMatch = tag.match(/^\d{4}-\d{2}-\d{2}$/);
                        if (dateMatch && tag >= monthStart && tag <= monthEnd) {
                            if (!postersByDate[tag]) {
                                postersByDate[tag] = [];
                            }
                            postersByDate[tag].push({
                                id: image.id,
                                name: image.title,
                                title: image.title,
                                description: image.description || '',
                                thumbnailUrl: image.thumbnailUrl || image.url,
                                imageUrl: image.url,
                                category: image.category || 'Festival',
                                downloads: image.downloads || 0,
                                isDownloaded: false,
                                tags: tags,
                                date: tag,
                                createdAt: image.createdAt.toISOString(),
                                updatedAt: image.updatedAt.toISOString()
                            });
                        }
                    });
                }
            });
        }
        catch (error) {
            console.error('⚠️ [CALENDAR API] Error fetching from Image model:', error);
        }
        // Fetch from mobile_templates model
        try {
            const templates = await prisma.mobile_templates.findMany({
                where: {
                    AND: [
                        { isActive: true },
                        {
                            OR: [
                                { category: 'FESTIVAL' },
                                { category: 'CALENDAR' },
                                {
                                    tags: {
                                        contains: `${year}-${String(month).padStart(2, '0')}`
                                    }
                                }
                            ]
                        }
                    ]
                },
                orderBy: { createdAt: 'desc' },
                take: 200
            });
            // Group templates by date from tags
            templates.forEach((template) => {
                if (template.tags) {
                    const tags = template.tags.split(',').map((tag) => tag.trim());
                    tags.forEach((tag) => {
                        // Check if tag matches date format YYYY-MM-DD
                        const dateMatch = tag.match(/^\d{4}-\d{2}-\d{2}$/);
                        if (dateMatch && tag >= monthStart && tag <= monthEnd) {
                            if (!postersByDate[tag]) {
                                postersByDate[tag] = [];
                            }
                            postersByDate[tag].push({
                                id: template.id,
                                name: template.title,
                                title: template.title,
                                description: template.description || '',
                                thumbnailUrl: template.thumbnailUrl || template.imageUrl,
                                imageUrl: template.imageUrl,
                                category: template.category || 'Festival',
                                downloads: template.downloads || 0,
                                isDownloaded: false,
                                tags: tags,
                                date: tag,
                                createdAt: template.createdAt.toISOString(),
                                updatedAt: template.updatedAt.toISOString()
                            });
                        }
                    });
                }
            });
        }
        catch (error) {
            console.error('⚠️ [CALENDAR API] Error fetching from mobile_templates model:', error);
        }
        // Remove duplicates from each date
        Object.keys(postersByDate).forEach((date) => {
            postersByDate[date] = postersByDate[date].filter((poster, index, self) => index === self.findIndex((p) => p.id === poster.id));
        });
        const totalPosters = Object.values(postersByDate).reduce((sum, posters) => sum + posters.length, 0);
        console.log(`✅ [CALENDAR API] Found ${totalPosters} poster(s) across ${Object.keys(postersByDate).length} dates for month ${year}-${month}`);
        res.json({
            success: true,
            data: {
                posters: postersByDate,
                month,
                year,
                total: totalPosters
            },
            message: `Posters for ${year}-${month} fetched successfully`
        });
    }
    catch (error) {
        console.error('❌ [CALENDAR API] Error fetching posters by month:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch posters',
            message: error.message || 'Internal server error'
        });
    }
});
exports.default = router;
//# sourceMappingURL=calendar.js.map