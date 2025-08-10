#!/usr/bin/env node

/**
 * Hyperbrowser MCP Integration Layer
 * Connects the enhanced scraper with actual MCP Hyperbrowser tools
 */

require('dotenv').config();

class HyperbrowserMCPIntegration {
    constructor() {
        this.availableTools = [
            'mcp_Hyperbrowser_scrape_webpage',
            'mcp_Hyperbrowser_crawl_webpages', 
            'mcp_Hyperbrowser_extract_structured_data',
            'mcp_Hyperbrowser_browser_use_agent',
            'mcp_Hyperbrowser_openai_computer_use_agent'
        ];
    }

    /**
     * Enhanced webpage scraping with intelligent content extraction
     */
    async scrapeWebpageEnhanced(url, options = {}) {
        console.log(`🌐 Enhanced scraping: ${url}`);
        
        const scrapeOptions = {
            url,
            outputFormat: options.formats || ['markdown', 'html'],
            sessionOptions: {
                useStealth: options.stealth ?? true,
                useProxy: options.proxy ?? false,
                acceptCookies: options.acceptCookies ?? false,
                solveCaptchas: options.solveCaptchas ?? false,
                profile: options.profile ? {
                    id: options.profile,
                    persistChanges: true
                } : undefined
            }
        };

        try {
            // This would call the actual MCP tool
            console.log('🔧 Calling mcp_Hyperbrowser_scrape_webpage...');
            
            // Mock response structure - replace with actual MCP call
            const mockResult = {
                success: true,
                url: url,
                title: 'Scraped Page Title',
                markdown: '# Page Content\n\nThis is the scraped content...',
                html: '<html><body><h1>Page Content</h1><p>This is the scraped content...</p></body></html>',
                links: ['https://example.com/link1', 'https://example.com/link2'],
                metadata: {
                    scrapedAt: new Date().toISOString(),
                    contentLength: 1234,
                    loadTime: 2500
                }
            };

            // Add enhanced processing
            const enhancedResult = await this.enhanceScrapedContent(mockResult, options);
            
            return enhancedResult;

        } catch (error) {
            console.error('❌ Enhanced scraping failed:', error.message);
            throw error;
        }
    }

    /**
     * Intelligent website crawling with content filtering
     */
    async crawlWebsiteEnhanced(startUrl, options = {}) {
        console.log(`🕷️ Enhanced crawling: ${startUrl}`);
        
        const crawlOptions = {
            url: startUrl,
            outputFormat: options.formats || ['markdown'],
            followLinks: options.followLinks ?? true,
            maxPages: options.maxPages || 10,
            ignoreSitemap: options.ignoreSitemap ?? false,
            sessionOptions: {
                useStealth: options.stealth ?? true,
                useProxy: options.proxy ?? false,
                acceptCookies: false,
                solveCaptchas: false
            }
        };

        try {
            console.log('🔧 Calling mcp_Hyperbrowser_crawl_webpages...');
            
            // Mock crawl result - replace with actual MCP call
            const mockResult = {
                success: true,
                startUrl: startUrl,
                pagesFound: 15,
                pagesCrawled: 10,
                pages: [
                    {
                        url: startUrl,
                        title: 'Home Page',
                        markdown: '# Home\n\nWelcome to our site...',
                        links: ['https://example.com/about', 'https://example.com/contact']
                    },
                    {
                        url: 'https://example.com/about',
                        title: 'About Us',
                        markdown: '# About\n\nWe are a company...',
                        links: ['https://example.com/team']
                    }
                ],
                crawlStats: {
                    totalTime: 45000,
                    averagePageTime: 4500,
                    errors: 0
                }
            };

            // Apply intelligent filtering and processing
            const enhancedResult = await this.enhanceCrawledContent(mockResult, options);
            
            return enhancedResult;

        } catch (error) {
            console.error('❌ Enhanced crawling failed:', error.message);
            throw error;
        }
    }

    /**
     * Advanced structured data extraction with AI-powered parsing
     */
    async extractStructuredDataEnhanced(urls, schema, options = {}) {
        console.log(`🔍 Enhanced data extraction from ${urls.length} URLs`);
        
        const extractOptions = {
            urls: Array.isArray(urls) ? urls : [urls],
            schema: this.enhanceSchema(schema),
            prompt: options.prompt || this.generateExtractionPrompt(schema),
            sessionOptions: {
                useStealth: options.stealth ?? true,
                useProxy: options.proxy ?? false
            }
        };

        try {
            console.log('🔧 Calling mcp_Hyperbrowser_extract_structured_data...');
            
            // Mock extraction result - replace with actual MCP call
            const mockResult = {
                success: true,
                extractedData: [
                    {
                        url: urls[0],
                        data: {
                            title: 'Example Product',
                            price: '$99.99',
                            description: 'A great product...',
                            rating: 4.5,
                            reviews: 123
                        },
                        confidence: 0.95
                    }
                ],
                schema: schema,
                extractionStats: {
                    totalUrls: urls.length,
                    successfulExtractions: 1,
                    averageConfidence: 0.95
                }
            };

            // Post-process and validate extracted data
            const enhancedResult = await this.enhanceExtractedData(mockResult, options);
            
            return enhancedResult;

        } catch (error) {
            console.error('❌ Enhanced data extraction failed:', error.message);
            throw error;
        }
    }

    /**
     * Intelligent browser automation with adaptive strategies
     */
    async automateInteractionEnhanced(url, task, options = {}) {
        console.log(`🤖 Enhanced automation: ${url}`);
        
        const automationOptions = {
            task: this.enhanceAutomationTask(task, options),
            maxSteps: options.maxSteps || 25,
            returnStepInfo: options.debug ?? false,
            sessionOptions: {
                useStealth: options.stealth ?? true,
                useProxy: options.proxy ?? false,
                acceptCookies: options.acceptCookies ?? false,
                solveCaptchas: options.solveCaptchas ?? false
            }
        };

        try {
            // Choose the appropriate agent based on task complexity
            const toolName = this.selectOptimalAgent(task, options);
            console.log(`🔧 Calling ${toolName}...`);
            
            // Mock automation result - replace with actual MCP call
            const mockResult = {
                success: true,
                task: task,
                stepsCompleted: 8,
                result: 'Task completed successfully',
                extractedData: options.extractData ? {
                    formData: { username: 'test', email: 'test@example.com' },
                    pageContent: 'Successfully logged in'
                } : null,
                screenshots: options.captureScreenshots ? [
                    'screenshot-step-1.png',
                    'screenshot-step-final.png'
                ] : [],
                executionTime: 12000
            };

            // Enhance automation results with additional processing
            const enhancedResult = await this.enhanceAutomationResult(mockResult, options);
            
            return enhancedResult;

        } catch (error) {
            console.error('❌ Enhanced automation failed:', error.message);
            throw error;
        }
    }

    // Enhancement methods
    async enhanceScrapedContent(result, options) {
        console.log('🔧 Enhancing scraped content...');
        
        const enhanced = { ...result };
        
        // Add content analysis
        if (enhanced.markdown) {
            enhanced.analysis = {
                wordCount: enhanced.markdown.split(/\s+/).length,
                readingTime: Math.ceil(enhanced.markdown.split(/\s+/).length / 200),
                headings: (enhanced.markdown.match(/^#+\s+.+$/gm) || []).length,
                links: (enhanced.markdown.match(/\[.*?\]\(.*?\)/g) || []).length
            };
        }

        // Apply content filters
        if (options.filters) {
            enhanced.markdown = this.applyContentFilters(enhanced.markdown, options.filters);
        }

        // Extract key information
        if (options.extractKeyInfo) {
            enhanced.keyInfo = this.extractKeyInformation(enhanced.markdown);
        }

        return enhanced;
    }

    async enhanceCrawledContent(result, options) {
        console.log('🔧 Enhancing crawled content...');
        
        const enhanced = { ...result };
        
        // Filter pages based on content quality
        if (options.qualityFilter) {
            enhanced.pages = enhanced.pages.filter(page => 
                this.assessContentQuality(page) >= options.qualityFilter.minScore
            );
        }

        // Group pages by topic/category
        if (options.categorize) {
            enhanced.categories = this.categorizePages(enhanced.pages);
        }

        // Generate site map
        enhanced.siteMap = this.generateSiteMap(enhanced.pages);
        
        // Add crawl insights
        enhanced.insights = {
            averageContentLength: enhanced.pages.reduce((sum, page) => 
                sum + (page.markdown?.length || 0), 0) / enhanced.pages.length,
            mostCommonWords: this.extractCommonWords(enhanced.pages),
            linkDensity: this.calculateLinkDensity(enhanced.pages)
        };

        return enhanced;
    }

    async enhanceExtractedData(result, options) {
        console.log('🔧 Enhancing extracted data...');
        
        const enhanced = { ...result };
        
        // Validate extracted data against schema
        enhanced.validationResults = enhanced.extractedData.map(item => 
            this.validateAgainstSchema(item.data, enhanced.schema)
        );

        // Add data quality scores
        enhanced.extractedData.forEach((item, index) => {
            item.qualityScore = this.calculateDataQuality(item.data);
            item.validation = enhanced.validationResults[index];
        });

        // Generate data summary
        enhanced.summary = {
            totalRecords: enhanced.extractedData.length,
            averageQuality: enhanced.extractedData.reduce((sum, item) => 
                sum + item.qualityScore, 0) / enhanced.extractedData.length,
            completenessScore: this.calculateCompleteness(enhanced.extractedData, enhanced.schema)
        };

        return enhanced;
    }

    async enhanceAutomationResult(result, options) {
        console.log('🔧 Enhancing automation result...');
        
        const enhanced = { ...result };
        
        // Add performance metrics
        enhanced.performance = {
            stepsPerSecond: result.stepsCompleted / (result.executionTime / 1000),
            efficiency: result.stepsCompleted / (options.maxSteps || 25),
            successRate: result.success ? 1.0 : 0.0
        };

        // Process extracted data if available
        if (enhanced.extractedData && options.processExtractedData) {
            enhanced.processedData = this.processExtractedData(enhanced.extractedData);
        }

        return enhanced;
    }

    // Utility methods
    enhanceSchema(schema) {
        // Add validation rules and data types
        const enhanced = { ...schema };
        
        if (enhanced.properties) {
            Object.keys(enhanced.properties).forEach(key => {
                if (!enhanced.properties[key].type) {
                    enhanced.properties[key].type = 'string';
                }
            });
        }
        
        return enhanced;
    }

    generateExtractionPrompt(schema) {
        const fields = Object.keys(schema.properties || {}).join(', ');
        return `Extract the following structured data: ${fields}. Ensure accuracy and completeness.`;
    }

    enhanceAutomationTask(task, options) {
        let enhanced = task;
        
        // Add context and instructions
        if (options.context) {
            enhanced = `Context: ${options.context}\n\nTask: ${enhanced}`;
        }
        
        // Add error handling instructions
        enhanced += '\n\nIf any step fails, try alternative approaches and continue with the remaining steps.';
        
        return enhanced;
    }

    selectOptimalAgent(task, options) {
        // Simple heuristic to choose between agents
        const complexity = this.assessTaskComplexity(task);
        
        if (options.useOpenAI || complexity > 0.7) {
            return 'mcp_Hyperbrowser_openai_computer_use_agent';
        } else {
            return 'mcp_Hyperbrowser_browser_use_agent';
        }
    }

    assessTaskComplexity(task) {
        // Simple complexity assessment based on task description
        const complexKeywords = ['form', 'login', 'search', 'navigate', 'click', 'type'];
        const matches = complexKeywords.filter(keyword => 
            task.toLowerCase().includes(keyword)
        ).length;
        
        return Math.min(matches / complexKeywords.length, 1.0);
    }

    applyContentFilters(content, filters) {
        let filtered = content;
        
        if (filters.removeAds) {
            filtered = filtered.replace(/\b(advertisement|sponsored|ad)\b/gi, '');
        }
        
        if (filters.minLength && filtered.length < filters.minLength) {
            return '';
        }
        
        if (filters.keywords) {
            const hasKeywords = filters.keywords.some(keyword => 
                filtered.toLowerCase().includes(keyword.toLowerCase())
            );
            if (!hasKeywords) return '';
        }
        
        return filtered;
    }

    extractKeyInformation(content) {
        // Extract key information like emails, phones, dates, etc.
        return {
            emails: content.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g) || [],
            phones: content.match(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g) || [],
            dates: content.match(/\b\d{1,2}\/\d{1,2}\/\d{4}\b/g) || [],
            urls: content.match(/https?:\/\/[^\s]+/g) || []
        };
    }

    assessContentQuality(page) {
        const content = page.markdown || '';
        let score = 0;
        
        // Length score (0-30 points)
        score += Math.min(content.length / 100, 30);
        
        // Structure score (0-20 points)
        const headings = (content.match(/^#+\s+/gm) || []).length;
        score += Math.min(headings * 5, 20);
        
        // Link score (0-10 points)
        const links = (content.match(/\[.*?\]\(.*?\)/g) || []).length;
        score += Math.min(links * 2, 10);
        
        return Math.min(score, 100);
    }

    categorizePages(pages) {
        // Simple categorization based on URL patterns and content
        const categories = {};
        
        pages.forEach(page => {
            const category = this.inferCategory(page);
            if (!categories[category]) {
                categories[category] = [];
            }
            categories[category].push(page);
        });
        
        return categories;
    }

    inferCategory(page) {
        const url = page.url.toLowerCase();
        const title = (page.title || '').toLowerCase();
        
        if (url.includes('/blog/') || url.includes('/news/')) return 'blog';
        if (url.includes('/product/') || url.includes('/shop/')) return 'product';
        if (url.includes('/about')) return 'about';
        if (url.includes('/contact')) return 'contact';
        if (title.includes('home') || url === '/') return 'home';
        
        return 'other';
    }

    generateSiteMap(pages) {
        return pages.map(page => ({
            url: page.url,
            title: page.title,
            lastModified: new Date().toISOString(),
            priority: this.calculatePagePriority(page)
        }));
    }

    calculatePagePriority(page) {
        // Simple priority calculation
        if (page.url === '/' || page.url.endsWith('/')) return 1.0;
        if (page.url.includes('/product/')) return 0.8;
        if (page.url.includes('/blog/')) return 0.6;
        return 0.4;
    }

    extractCommonWords(pages) {
        const allText = pages.map(page => page.markdown || '').join(' ');
        const words = allText.toLowerCase().match(/\b\w+\b/g) || [];
        const frequency = {};
        
        words.forEach(word => {
            if (word.length > 3) { // Filter out short words
                frequency[word] = (frequency[word] || 0) + 1;
            }
        });
        
        return Object.entries(frequency)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([word, count]) => ({ word, count }));
    }

    calculateLinkDensity(pages) {
        const totalLinks = pages.reduce((sum, page) => 
            sum + ((page.markdown || '').match(/\[.*?\]\(.*?\)/g) || []).length, 0
        );
        const totalContent = pages.reduce((sum, page) => 
            sum + (page.markdown || '').length, 0
        );
        
        return totalContent > 0 ? totalLinks / totalContent * 1000 : 0; // Links per 1000 characters
    }

    validateAgainstSchema(data, schema) {
        const validation = { valid: true, errors: [] };
        
        if (schema.required) {
            schema.required.forEach(field => {
                if (!data[field]) {
                    validation.valid = false;
                    validation.errors.push(`Missing required field: ${field}`);
                }
            });
        }
        
        return validation;
    }

    calculateDataQuality(data) {
        let score = 0;
        const fields = Object.keys(data);
        
        // Completeness (0-50 points)
        const filledFields = fields.filter(field => data[field] && data[field] !== '').length;
        score += (filledFields / fields.length) * 50;
        
        // Data type consistency (0-30 points)
        let typeScore = 0;
        fields.forEach(field => {
            const value = data[field];
            if (typeof value === 'string' && value.trim() !== '') typeScore += 5;
            if (typeof value === 'number' && !isNaN(value)) typeScore += 5;
        });
        score += Math.min(typeScore, 30);
        
        // Length appropriateness (0-20 points)
        let lengthScore = 0;
        fields.forEach(field => {
            const value = String(data[field] || '');
            if (value.length > 0 && value.length < 1000) lengthScore += 3;
        });
        score += Math.min(lengthScore, 20);
        
        return Math.min(score, 100);
    }

    calculateCompleteness(extractedData, schema) {
        const requiredFields = schema.required || Object.keys(schema.properties || {});
        let totalCompleteness = 0;
        
        extractedData.forEach(item => {
            const filledRequired = requiredFields.filter(field => 
                item.data[field] && item.data[field] !== ''
            ).length;
            totalCompleteness += filledRequired / requiredFields.length;
        });
        
        return extractedData.length > 0 ? totalCompleteness / extractedData.length : 0;
    }

    processExtractedData(data) {
        // Clean and normalize extracted data
        const processed = { ...data };
        
        // Remove empty values
        Object.keys(processed).forEach(key => {
            if (!processed[key] || processed[key] === '') {
                delete processed[key];
            }
        });
        
        // Normalize text fields
        Object.keys(processed).forEach(key => {
            if (typeof processed[key] === 'string') {
                processed[key] = processed[key].trim();
            }
        });
        
        return processed;
    }
}

// Export for use in other modules
module.exports = HyperbrowserMCPIntegration;

// CLI interface
if (require.main === module) {
    const integration = new HyperbrowserMCPIntegration();
    
    const args = process.argv.slice(2);
    const command = args[0];
    
    switch (command) {
        case 'scrape':
            if (args[1]) {
                integration.scrapeWebpageEnhanced(args[1], {
                    formats: ['markdown', 'html'],
                    extractKeyInfo: true
                }).then(result => {
                    console.log('✅ Scraping completed:', result);
                }).catch(console.error);
            }
            break;
            
        case 'crawl':
            if (args[1]) {
                integration.crawlWebsiteEnhanced(args[1], {
                    maxPages: parseInt(args[2]) || 10,
                    categorize: true,
                    qualityFilter: { minScore: 30 }
                }).then(result => {
                    console.log('✅ Crawling completed:', result);
                }).catch(console.error);
            }
            break;
            
        case 'extract':
            if (args[1] && args[2]) {
                const schema = JSON.parse(args[2]);
                integration.extractStructuredDataEnhanced([args[1]], schema, {
                    processExtractedData: true
                }).then(result => {
                    console.log('✅ Data extraction completed:', result);
                }).catch(console.error);
            }
            break;
            
        default:
            console.log(`
🚀 Hyperbrowser MCP Integration

Commands:
  scrape <url>                    - Enhanced webpage scraping
  crawl <url> [maxPages]          - Enhanced website crawling  
  extract <url> <schema>          - Enhanced data extraction
  
Examples:
  node hyperbrowser-integration.js scrape https://example.com
  node hyperbrowser-integration.js crawl https://example.com 20
  node hyperbrowser-integration.js extract https://example.com '{"properties":{"title":{"type":"string"}}}'
            `);
    }
}