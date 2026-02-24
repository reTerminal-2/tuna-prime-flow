# AI Manager VM Backend Setup

If the Netlify Edge Function is being rate-limited or blocked, you can run this Python backend on a dedicated VM (DigitalOcean, AWS, Google Cloud) or your local machine.

## Option 1: Run Locally (Python)
1. Install Python 3.10+
2. Navigate to the `backend` folder:
   ```bash
   cd backend
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Run the server:
   ```bash
   python main.py
   ```
The server will start on `http://localhost:6969`.

## Option 2: Run with Docker (Recommended for VMs)
1. Install Docker on your VM.
2. Navigate to the `backend` folder.
3. Build the image:
   ```bash
   docker build -t tunaflow-ai-backend .
   ```
4. Run the container:
   ```bash
   docker run -d -p 6969:6969 tunaflow-ai-backend
   ```

## Connecting the Frontend
Once your VM is running, the frontend needs to know where it is.
If running on a separate VM, you would need to update the URL in `src/services/aiService.ts` to point to `http://your-vm-ip:6969/api/g4f`.
