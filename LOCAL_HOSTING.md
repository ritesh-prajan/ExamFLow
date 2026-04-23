# Local Hosting Instructions for ExamFlow

To run ExamFlow on your own machine, follow these steps:

## 1. Prerequisites
- **Node.js**: Install Node.js (v18 or higher recommended).
- **NPM**: Comes bundled with Node.js.

## 2. Setup
1.  **Clone/Download**: Download the project files to your local machine.
2.  **Install Dependencies**: Open your terminal in the project folder and run:
    ```bash
    npm install
    ```
3.  **Configure Environment**: 
    - Create a file named `.env` in the root directory.
    - Copy the contents from `.env.example` into `.env`.
    - Fill in your **`EXAMFLOW_AI_SECRET`** (Gemini API Key) and your **Firebase** credentials.

## 3. Running the App
Run the following command to start the development server:
```bash
npm run dev
```
The app will be available at **`http://localhost:3000`**. 

> **IMPORTANT**: Do not use `npm run vite` or hit port 5173 directly, as the AI features require the backend server running on port 3000.

## 4. Troubleshooting 404 Errors
If you get a "Server returned error 404" when parsing a syllabus:
1.  **Check the Port**: Ensure you are visiting `http://localhost:3000` and NOT `http://localhost:5173`.
2.  **Check the Terminal**: Ensure the terminal where you ran `npm run dev` didn't crash or show a "Port already in use" error.
    - If you see `EADDRINUSE`, run: `npx kill-port 3000` and then try `npm run dev` again.
3.  **Check .env**: Ensure your `EXAMFLOW_AI_SECRET` is correctly set in your `.env` file.

## 5. Building for Production
To create a production-ready build:
```bash
npm run build
```
The static files will be generated in the `dist/` folder.

## 6. Hosting on Netlify (Optional)
If you want to host it on Netlify manually:
1.  Install the Netlify CLI: `npm install -g netlify-cli`
2.  Login: `netlify login`
3.  Run locally with functions: `netlify dev`
4.  Deploy: `netlify deploy --prod`

---

### **Important Note on Firebase**
When running locally, ensure you add `http://localhost:3000` to your **Authorized Domains** in the Firebase Console (Authentication > Settings > Authorized domains).
