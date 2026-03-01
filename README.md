# Roblox Asset Manager (Serverless / Vercel Ready)

A fullstack application designed to manage, upload, and serve Roblox asset files (.rbxm, .rbxl, etc.) with a highly secure admin panel. This version is completely structured for **Vercel** serverless functions, using **MongoDB Atlas** for database persistence and **Cloudinary** for scalable file storage.

## Features

- **Public View:** Clean, modern grid displaying `OPEN` files for anyone to download.
- **Admin Panel:** Secured via JWT, allows uploading, deleting, and toggling visibility of files.
- **Vercel Native:** Fully compatible with Vercel serverless. Eliminates ephemeral disk wiping by using Cloud architectures.
- **Security:**
  - JWT Token Authentication
  - Brute force protection with express-rate-limit
  - Helmet for secure HTTP headers

## Vercel Deployment

1. Make sure your GitHub repository has all these files.
2. Sign up and log in to [Vercel](https://vercel.com).
3. Import your GitHub repository to Vercel.
4. During setup, make sure you configure the **Environment Variables** (see below) before clicking Deploy.

## Environment Variables (`.env`)
You must provide the following keys in your Vercel settings or `.env` file locally:

```env
# Optional internally, Vercel dynamically sets ports
PORT=3000

# Authentication
JWT_SECRET=your_long_secure_random_string
ADMIN_USERNAME=your_admin_username
ADMIN_PASSWORD=your_admin_password

# Database (MongoDB Atlas)
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.../roblox-assets?retryWrites=true&w=majority

# File Storage (Cloudinary)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Misc
MAX_FILE_SIZE=52428800
```
4. Start the server:
   ```bash
   npm start
   ```

## Admin Access
Go to `http://localhost:3000/admin` to access the admin panel.
Default credentials defined in `.env`:
- Username: `namaadminmu`
- Password: `passwordkuatmu`

## File Upload Details
Permitted extensions: `.rbxm`, `.rbxl`, `.rbxmx`, `.zip`, `.png`, `.jpg`, `.jpeg`.
Max default size: `50MB`. (Configurable in `.env`)
