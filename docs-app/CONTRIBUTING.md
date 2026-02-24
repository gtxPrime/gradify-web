# 🤝 Contributing to Gradify

Thank you for your interest in contributing to Gradify! This guide will help you contribute content (lectures, quizzes, formulas) and code.

---

## 📝 Contributing Content

### Adding Lectures

1. **Prepare your lecture data**:
   - Collect YouTube video IDs
   - Organize by week/topic
   - Create descriptive titles

2. **Create JSON file**:

   ```json
   {
     "subject": "Your Subject",
     "lectures": [
       {
         "week": 1,
         "title": "Introduction",
         "videoId": "YouTube_Video_ID"
       }
     ]
   }
   ```

3. **Submit**:
   - Fork the repository
   - Add file to `data/lectures/Foundation/` or `data/lectures/Diploma/`
   - Update `data/index.json`
   - Create pull request

### Adding Quizzes

1. **Create quiz JSON** following the IIT-M format:

   ```json
   {
     "papers": [
       {
         "paper_name": "Subject Name_DD Mon YYYY",
         "total_time_minutes": "60",
         "subject": "Subject Name",
         "year": "2024",
         "session": "Quiz 1"
       }
     ],
     "questions": [
       {
         "question_number": 1,
         "question_text": "Your question text here",
         "question_type": "mcq",
         "marks": 6,
         "question_image_url": "",
         "options": [
           {
             "text": "Option A text",
             "image_url": "",
             "is_correct": true
           },
           {
             "text": "Option B text",
             "image_url": "",
             "is_correct": false
           },
           {
             "text": "Option C text",
             "image_url": "",
             "is_correct": false
           },
           {
             "text": "Option D text",
             "image_url": "",
             "is_correct": false
           }
         ]
       }
     ]
   }
   ```

   **Notes**:
   - Use `question_image_url` for questions with images
   - Use `image_url` in options for image-based choices
   - Set `is_correct: true` for the correct answer
   - Leave `text` or `image_url` empty if not used

2. **Encrypt (optional)**:

   ```bash
   python scripts/encrypt_quiz.py your_quiz.json
   ```

3. **Submit via pull request**

### Updating Grade Calculation Formulas

The grade calculation logic is powered by `data/formulas.json`. These formulas are used by the `GradeCalculationFragment` to dynamically generate input fields and calculate subject totals.

**Steps to edit/add a formula:**

1. **Locate the subject**: Open `data/formulas.json` and find the subject entry.
2. **Define `inputs`**: Add an array of strings for each variable required (e.g., `GAA`, `Qz1`, `Qz2`, `F`, `Bonus`).
   - _Note_: These strings will be used as labels for the input fields in the app.
3. **Write the `formula`**:
   - Use standard mathematical operators: `+`, `-`, `*`, `/`.
   - For "Best of" logic, use `Math.max(a, b)` or `Math.min(a, b)`.
   - Ensure every variable used in the formula is present in the `inputs` array.
   - Example: `"0.1 * GAA + Math.max(0.6 * F + 0.2 * Math.max(Qz1, Qz2), 0.4 * F + 0.2 * Qz1 + 0.3 * Qz2)"`
4. **Set `type`**: Use `"subject"` or `"project"`.

**Full Example:**

```json
"Stats 1": {
  "type": "subject",
  "inputs": ["GAA", "Qz1", "Qz2", "F", "Bonus"],
  "formula": "0.1 * GAA + Math.max(0.6 * F + 0.2 * Math.max(Qz1, Qz2), 0.4 * F + 0.2 * Qz1 + 0.3 * Qz2) + Bonus"
}
```

---

## 💻 Contributing Code

### Setup Development Environment

1. Fork and clone
2. Follow [Build & Run Guide](BUILD_AND_RUN.md)
3. Create feature branch
4. Make changes
5. Test thoroughly
6. Submit pull request

### Code Style

- Follow Java conventions
- Add comments for complex logic
- Use meaningful variable names
- Keep methods focused and small

### Pull Request Guidelines

- Clear description of changes
- Reference related issues
- Include screenshots for UI changes
- Ensure all tests pass

---

## 🐛 Reporting Bugs

Use [GitHub Issues](https://github.com/gtxPrime/Gradify-App/issues) with:

- Clear title
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable
- Device/Android version

---

## 💡 Feature Requests

We welcome feature ideas! Open an issue with:

- Clear description
- Use case
- Mockups if applicable

---

Thank you for contributing to Gradify! 🎉
