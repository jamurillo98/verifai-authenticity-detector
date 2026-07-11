# VerifAi — AI Image Authenticity Detector

VerifAi is an early-stage ACU Capstone Project designed to detect whether an image is AI-generated or human-created. The project aims to provide a simple, accessible authenticity-checking tool that can be used by students, educators, and professionals who need fast verification of digital media.

This prototype is currently in active development and represents the foundation of a larger authenticity detection system planned for Semester 2.

---

## 📌 Why We Built This Project

The rapid growth of AI-generated media has created challenges in education, journalism, cybersecurity, and digital integrity. VerifAi was created to explore:

- How AI-generated images can be detected using confidence scoring.
- How students can build real-world API pipelines and backend logic.
- How cloud services (Supabase, Vercel) can support media analysis workflows.
- How authenticity tools can be made simple and accessible.

This project also serves as a practical learning experience in:

- API engineering  
- backend development  
- cloud integration  
- image processing pipelines  
- full-stack deployment  

---

## 🛠️ Technologies Used

- **Next.js** — Front-end framework  
- **React** — UI components  
- **TypeScript** — Strong typing and reliability  
- **Supabase** — Authentication + database (currently paused)  
- **Custom API endpoints** — Image analysis + confidence scoring  
- **Vercel** — Hosting and deployment  
- **GitHub** — Version control and collaboration  

---

## ▶️ How to Run the Project

No installation is required.

Simply open the deployed link:

**https://getverifaid.vercel.app**

The prototype runs entirely in the browser.

---

## 🎥 Demo & Screenshots

### Live Deployment  
https://getverifaid.vercel.app

### Screenshots  
*(Add your screenshots here once captured)*  
Example placeholders:
- `./screenshots/upload-page.png`
- `./screenshots/analysis-result.png`
- `./screenshots/error-state.png`

### Demo Video  
A demo video will be added once the Supabase backend is reactivated and the scanning pipeline is fully functional.

---

## ⚠️ Current Limitations (Early Stage Prototype)

### 1. **Supabase Backend Paused**
The Supabase database is currently paused, which prevents:
- image uploads  
- scan requests  
- confidence scoring  
- user authentication  

This is the main blocker preventing full functionality.

### 2. **Limited Text Visibility**
Some UI elements (labels, results, error messages) have low contrast or small sizing, making them harder to read. This will be improved in the next UI update.

### 3. **Incomplete API Pipeline**
The image analysis API is still under construction.  
Current limitations include:
- no real AI detection yet  
- placeholder responses  
- incomplete error handling  
- missing logging and validation  

### 4. **No Mobile Optimization**
The current layout is desktop-first and may not render correctly on smaller screens.

---

## 🔮 Future Improvements (Based on Challenges & Learnings)

### **1. Improve Collaboration Workflow**
- Enforce feature-branch workflow  
- Require pull-from-dev before coding  
- Add automated merge conflict detection  
**Why:** Prevents merge conflicts and ensures stable development flow.

### **2. Strengthen Database Reliability**
- Fix Supabase foreign key constraints  
- Add clearer error messages for blocked writes  
- Improve schema documentation  
**Why:** Ensures user scan history and authentication work consistently.

### **3. Enhance AI Detection Accuracy**
- Add fallback detection for older GAN models  
- Integrate multiple detection engines for cross-validation  
**Why:** Sightengine struggled with older AI methods, reducing accuracy.

### **4. Improve Dev Environment Stability**
- Resolve port conflicts with unified dev scripts  
- Add environment variable templates (`.env.example`)  
**Why:** Prevents backend/frontend clashes and silent failures.

### **5. Harden Authentication System**
- Add JWT secret validation  
- Improve error logging for auth failures  
**Why:** Silent JWT mismatches caused confusing behaviour.

### **6. Fix Upload & Pipeline Conflicts**
- Separate upload controllers  
- Add unit tests for Cloudinary pipeline  
**Why:** Prevents accidental overwrites and broken uploads.

### **7. Improve CORS Configuration**
- Open CORS fully during development  
- Restrict CORS properly in production  
**Why:** Deployment to Vercel caused CORS failures.

### **8. UI/UX Improvements**
- Increase text visibility and contrast  
- Improve spacing and readability  
**Why:** Current UI has low visibility in some areas.

### **9. Backend Availability**
- Reactivate Supabase  
- Add fallback mode when database is paused  
**Why:** Supabase downtime currently blocks scanning entirely.

---

## 👥 Team

Group project by:

- **Mim Kumar Gurung**  
- **Jerome Murillo**  
- **Maleesha Hirushan Rashmika**

Submitted to **Australian Catholic University**.

---

## 📄 License

MIT License  
Feel free to use, modify, and build upon this project.

