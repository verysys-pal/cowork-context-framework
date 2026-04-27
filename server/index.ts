import express, { Request, Response, NextFunction } from 'express';
import { validateOpenCodeRequest } from './utils/validation.utils'; // Assumed validation helper
import { coreOpenCodeGenerator } from './services/coreOpenCodeGenerator'; // Assumed core service

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * POST /api/v1/opencode-web
 * Handles the primary codebase generation request.
 * Expects: source_context (string), target_module (string)
 * Returns: JSON object containing streaming component structure or error details.
 */
app.post('/api/v1/opencode-web', async (req: Request, res: Response, next: NextFunction) => {
    try {
        // 1. Request Validation
        const { source_context, target_module } = req.body;

        if (!source_context || !target_module) {
            return res.status(400).json({
                success: false, 
                error: "Missing required fields: 'source_context' and 'target_module' are mandatory."
            });
        }

        // 2. Call Core Service
        console.log(`[API] Processing request for Target Module: ${target_module}`);
        
        // Simulate calling the powerful, core generator service
        const generationResult = await coreOpenCodeGenerator(
            sourceContext = source_context, 
            targetModule = target_module
        );

        // 3. Return Streamable Structure (Successful contract match)
        return res.status(200).json({
            success: true,
            // The result object is expected to be ready for client consumption
            generated_code: generationResult.code, 
            generated_components: generationResult.components 
        });


    } catch (error) {
        console.error("[API] Error in /opencode-web endpoint:", error);
        // 4. Error Handling
        res.status(500).json({
            success: false,
            error: 'Internal server error during code generation.',
            details: error instanceof Error ? error.message : String(error)
        });
    }
});

// Health Check Route
app.get('/api/v1/health', (req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', service: 'OpenCodeGenerator' });
});

export default app;
// This setup assumes 'server/index.ts' is the main Express app instance.
