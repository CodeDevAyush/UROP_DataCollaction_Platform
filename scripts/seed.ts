/**
 * Seeds development tasks (question bank) and default study settings.
 * Safe to re-run: uses upsert on task_code / setting key.
 *
 * Usage: npm run seed   (reads .env.local)
 */
import { config } from "dotenv";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

config({ path: resolve(__dirname, "../.env.local") });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

const STUDY_PHASE = "baseline";

const formalTasks = [
  {
    task_code: "formal-attendance-policy",
    title: "Mandatory Attendance Policy",
    scenario: `Your university is considering introducing a new policy requiring every student to maintain a minimum attendance of 85% in each course. The university administration believes that regular attendance improves academic performance, classroom participation, communication between students and faculty members, and overall academic discipline.

However, a number of students have raised concerns about the proposed policy. They argue that students may have different circumstances that affect their ability to attend every class. These may include health-related problems, internships, competitions, family responsibilities, transportation difficulties, participation in university activities, or other personal circumstances. Some students also believe that attendance alone should not determine whether a student is learning effectively, especially when students are able to understand course material independently.

The university has therefore asked students to provide a reasoned response before the policy is implemented. The response should consider the issue from more than one perspective and should ultimately communicate a clear position regarding the proposed attendance requirement.`,
    instructions:
      "Write your response in your own words. Do not use generative AI, translation tools, writing assistants, or previously prepared text. Write naturally and independently.",
    display_order: 1,
  },
  {
    task_code: "formal-online-vs-classroom",
    title: "Online Versus Classroom Learning",
    scenario: `Following recent improvements in campus infrastructure, the university is evaluating whether certain theory courses should be permanently offered online instead of in a physical classroom. Supporters argue that online delivery offers flexibility, recorded lectures for revision, and reduced commute time. Critics argue that classroom learning offers better engagement, easier doubt-clearing, and stronger peer interaction, and that some students struggle to stay disciplined in an online format.

The university has asked students to submit a reasoned opinion on whether theory courses should move online, remain in the classroom, or adopt some hybrid arrangement, considering the needs of different types of learners.`,
    instructions:
      "Write your response in your own words. Do not use generative AI, translation tools, writing assistants, or previously prepared text. Write naturally and independently.",
    display_order: 2,
  },
  {
    task_code: "formal-assessment-method",
    title: "Project-Based Versus Examination-Based Assessment",
    scenario: `The academic council is reviewing whether final-year courses should shift from primarily examination-based assessment toward primarily project-based assessment. Proponents of project-based assessment argue it better reflects real-world skills, encourages teamwork, and reduces reliance on memorization. Proponents of examination-based assessment argue it more fairly and consistently measures individual understanding and is harder to game through unequal group contributions.

The council has invited student submissions considering both perspectives before deciding on a department-wide policy.`,
    instructions:
      "Write your response in your own words. Do not use generative AI, translation tools, writing assistants, or previously prepared text. Write naturally and independently.",
    display_order: 3,
  },
  {
    task_code: "formal-internships-credit",
    title: "Academic Credit for Internships",
    scenario: `A proposal is being discussed to allow students to receive academic credit toward their degree for internships completed during the semester, potentially replacing one regular course each semester. Supporters believe this better prepares students for the workforce and rewards initiative already being taken by many students. Opponents worry it could dilute core coursework, create inequities for students who cannot secure internships, and be difficult to evaluate fairly across very different internship experiences.

Students have been asked to weigh in with a reasoned position before any policy change is proposed to the university administration.`,
    instructions:
      "Write your response in your own words. Do not use generative AI, translation tools, writing assistants, or previously prepared text. Write naturally and independently.",
    display_order: 4,
  },
  {
    task_code: "formal-technology-use-classroom",
    title: "Student Use of Personal Technology in Classrooms",
    scenario: `Some faculty members have proposed restricting the use of personal laptops and phones during lectures, citing distraction and reduced attentiveness, while allowing exceptions for note-taking or accessibility needs. Other faculty and many students argue that personal devices are essential for looking up references, accessing course materials, and taking notes efficiently, and that a blanket restriction is impractical and paternalistic.

The student council has asked for written opinions to represent the student body's views before any classroom policy is finalized.`,
    instructions:
      "Write your response in your own words. Do not use generative AI, translation tools, writing assistants, or previously prepared text. Write naturally and independently.",
    display_order: 5,
  },
];

const casualTasks = [
  {
    task_code: "casual-class-cancelled",
    title: "Asking About Class Cancellation",
    scenario:
      "Your friend messages you late at night asking whether tomorrow's class is cancelled because of heavy rain. Reply naturally as you would message that friend.",
    display_order: 1,
  },
  {
    task_code: "casual-assignment-deadline",
    title: "Assignment Deadline Check-in",
    scenario:
      "Your friend asks whether you have completed an assignment that is due tomorrow morning. Reply naturally.",
    display_order: 2,
  },
  {
    task_code: "casual-lunch-plans",
    title: "Making Lunch Plans",
    scenario:
      "You want to ask your friend whether they are coming to college tomorrow and whether they want to have lunch together. Send the message naturally.",
    display_order: 3,
  },
  {
    task_code: "casual-exam-result",
    title: "Comforting a Friend After a Poor Result",
    scenario: "Your friend receives a poor exam result and messages you about it. Reply naturally and try to comfort them.",
    display_order: 4,
  },
  {
    task_code: "casual-college-event",
    title: "College Event Invitation",
    scenario:
      "Your friend messages you about a college cultural event happening this weekend and asks if you want to go together. Reply naturally.",
    display_order: 5,
  },
  {
    task_code: "casual-group-project",
    title: "Group Project Coordination",
    scenario:
      "A group project teammate messages you asking who is handling which part of the assignment and when everyone can meet to finish it. Reply naturally.",
    display_order: 6,
  },
];

const aiTasks = [
  {
    task_code: "ai-attendance-policy",
    title: "Mandatory Attendance Policy",
    scenario: formalTasks[0].scenario,
    instructions:
      "Read the situation carefully. Instead of answering the situation yourself, write the instructions you would normally give to a generative-AI tool to help you prepare the response.\n\nWrite the instructions in your own natural words. You may specify what the AI should focus on, how it should organize the response, what tone or language it should use, what arguments it should include, how detailed it should be, or any other requirements you consider useful.\n\nDo not copy a prompt from another person or an existing source. Write approximately 500–1000 characters. Use your natural communication style. You may use English, Hindi, Tamil, Hinglish, Tanglish, abbreviations, informal language, or code-mixing if that is how you naturally communicate with AI tools. Do not intentionally add language mixing merely for the study.",
    minimum_characters: 500,
    maximum_characters: 1000,
    display_order: 1,
  },
  {
    task_code: "ai-assessment-method",
    title: "University Assessment Reform",
    scenario: formalTasks[2].scenario,
    instructions:
      "Read the situation carefully. Instead of answering the situation yourself, write the instructions you would normally give to a generative-AI tool to help you prepare the response.\n\nWrite approximately 500–1000 characters, in your own natural style. Do not copy a prompt from another person or an existing source.",
    minimum_characters: 500,
    maximum_characters: 1000,
    display_order: 2,
  },
  {
    task_code: "ai-technology-use",
    title: "Student Use of Personal Technology",
    scenario: formalTasks[4].scenario,
    instructions:
      "Read the situation carefully. Instead of answering the situation yourself, write the instructions you would normally give to a generative-AI tool to help you prepare the response.\n\nWrite approximately 500–1000 characters, in your own natural style. Do not copy a prompt from another person or an existing source.",
    minimum_characters: 500,
    maximum_characters: 1000,
    display_order: 3,
  },
  {
    task_code: "ai-social-media-policy",
    title: "Social Media Use and Academic Performance",
    scenario: `A student wellness committee is examining whether the university should run a mandatory workshop on healthy social-media habits, after survey data suggested many students feel it affects their sleep and focus. Some students find the idea useful; others feel it is unnecessary and intrusive into personal life choices.

The committee has asked students to submit their view on whether such a workshop should be introduced, and if so, in what form.`,
    instructions:
      "Read the situation carefully. Instead of answering the situation yourself, write the instructions you would normally give to a generative-AI tool to help you prepare the response.\n\nWrite approximately 500–1000 characters, in your own natural style. Do not copy a prompt from another person or an existing source.",
    minimum_characters: 500,
    maximum_characters: 1000,
    display_order: 4,
  },
  {
    task_code: "ai-time-management",
    title: "Balancing Academics and Extracurriculars",
    scenario: `The student affairs office is drafting guidance for first-year students on balancing coursework with clubs, sports, and social activities, after noticing many students struggle with time management in their first semester. They have asked current students to contribute perspective on how much emphasis this guidance should place on academics versus extracurricular involvement, and what practical advice it should include.`,
    instructions:
      "Read the situation carefully. Instead of answering the situation yourself, write the instructions you would normally give to a generative-AI tool to help you prepare the response.\n\nWrite approximately 500–1000 characters, in your own natural style. Do not copy a prompt from another person or an existing source.",
    minimum_characters: 500,
    maximum_characters: 1000,
    display_order: 5,
  },
];

const defaultSettings: Record<string, unknown> = {
  conditions_mandatory: { formal: true, casual: true, ai: true },
  task_counts: { formal: 1, casual: 5, ai: 1 },
  ai_tool_options: ["ChatGPT", "Gemini", "Claude", "Other"],
  ai_default_mode: "natural",
  current_study_phase: STUDY_PHASE,
  researcher_contact: "researcher@example.edu (replace in Admin > Settings)",
  faculty_mentor_contact: "faculty.mentor@example.edu (replace in Admin > Settings)",
  retention_policy: "Anonymized research data is retained for the duration of the UROP project and any resulting publication, per departmental guidelines. (Replace with your approved retention policy.)",
};

async function main() {
  console.log("Seeding formal tasks...");
  for (const t of formalTasks) {
    const { error } = await supabase.from("tasks").upsert(
      {
        task_code: t.task_code,
        condition: "formal",
        study_phase: STUDY_PHASE,
        title: t.title,
        scenario: t.scenario,
        instructions: t.instructions,
        minimum_characters: 1500,
        maximum_characters: 3000,
        display_order: t.display_order,
        active: true,
      },
      { onConflict: "task_code" }
    );
    if (error) throw error;
  }

  console.log("Seeding casual tasks...");
  for (const t of casualTasks) {
    const { error } = await supabase.from("tasks").upsert(
      {
        task_code: t.task_code,
        condition: "casual",
        study_phase: STUDY_PHASE,
        title: t.title,
        scenario: t.scenario,
        instructions:
          "Respond exactly as you normally would communicate with a friend. Use whatever language, expressions, abbreviations, slang, emojis, or punctuation you would naturally use.",
        minimum_characters: 100,
        maximum_characters: null,
        display_order: t.display_order,
        active: true,
      },
      { onConflict: "task_code" }
    );
    if (error) throw error;
  }

  console.log("Seeding AI tasks...");
  for (const t of aiTasks) {
    const { error } = await supabase.from("tasks").upsert(
      {
        task_code: t.task_code,
        condition: "ai",
        study_phase: STUDY_PHASE,
        title: t.title,
        scenario: t.scenario,
        instructions: t.instructions,
        minimum_characters: t.minimum_characters,
        maximum_characters: t.maximum_characters,
        display_order: t.display_order,
        active: true,
      },
      { onConflict: "task_code" }
    );
    if (error) throw error;
  }

  console.log("Seeding default study settings...");
  for (const [key, value] of Object.entries(defaultSettings)) {
    const { error } = await supabase.from("study_settings").upsert({ key, value }, { onConflict: "key" });
    if (error) throw error;
  }

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
