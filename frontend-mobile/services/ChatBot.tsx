export const askAI = async (userQuestion: string, personalData: any[], stats: any) => {
    const API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY;

    if (!API_KEY) return "API Key missing!";

    // تأمين البيانات
    const safeData = personalData || [];
    const role = stats?.role || "unknown";

    let systemContext = "";

    if (role === "instructor") {
        systemContext = `
            You are the Lead Academic Assistant for a Cairo University Instructor.
            You have full access to their courses, student names, grades, and attendance records:
            ${JSON.stringify(safeData)}
            
            Guidelines:
            1. If asked about students, provide their specific grades or attendance count from the data.
            2. Proactively help the instructor identify struggling students (e.g., those with low attendance or poor grades).
            3. Answer briefly, professionally, and use the data to be as specific as possible.
        `;
    } else {
        systemContext = `
            You are the Expert Academic Advisor for a Cairo University student.
            Here is the student's full academic record (subjects, grades, and attendance):
            ${JSON.stringify(safeData)}
            
            Strict Academic Rules you must apply:
            1. CALCULATIONS: University quiz scores MUST be divided by 2 before being added to midterm marks. 
            2. ATTENDANCE: If a student's attendance is below 75% in any subject, they are at risk of exam denial (Herman).
            
            Tasks:
            - Proactively warn the student if they are near or below the 75% attendance threshold.
            - Provide study advice based on their current grades.
            - Help them calculate what they need in the final to pass.
            - Answer briefly and supportively.
        `;
    }

    try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [
                    { role: "system", content: systemContext },
                    { role: "user", content: userQuestion || "Hello" }
                ],
                temperature: 0.6, // تقليل الـ temperature لزيادة الدقة في الأرقام
                max_tokens: 800
            })
        });

        const result = await response.json();
        
        if (result.error) {
            console.error("Groq Error:", result.error.message);
            return "AI Error: " + result.error.message;
        }

        return result.choices[0].message.content;
    } catch (error) {
        console.error("Fetch Error:", error);
        return "Connection failed. Groq is unreachable.";
    }
};