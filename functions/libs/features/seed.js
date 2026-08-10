"use strict";

// Dev-data seeding logic, shared by endpoints/testBed/seed.js. Goes through
// the same services/database.js validation path as everything else -- a bad
// fixture here fails loudly instead of writing an unvalidated doc.
//
// Every fixture has a stable id so re-running the seeder overwrites rather
// than duplicating, and so the cross-references below (a batch's courseId, a
// student's batchId, a payment's studentId) can be written literally instead
// of threaded through generated ids.
const auth = require("../services/auth");
const db = require("../services/database");
const { today } = require("../utils/clock");

const DEV_USER = { email: "dev@example.com", password: "password123" };

const COURSES = [
  {
    id: "course-mern",
    title: "MERN Full Stack Development",
    category: "software",
    durationWeeks: 24,
    feeAmount: 65000,
    description: "React, Node, Express and MongoDB, project-led.",
    active: true,
  },
  {
    id: "course-wedding-photo",
    title: "Wedding Photography Intensive",
    category: "photography",
    durationWeeks: 8,
    feeAmount: 32000,
    description: "Lighting, candid coverage, albums and client handling.",
    active: true,
  },
  {
    id: "course-spoken-english",
    title: "Spoken English & Interview Skills",
    category: "professional",
    durationWeeks: 12,
    feeAmount: 18000,
    description: "Fluency, group discussion and mock interviews.",
    active: true,
  },
];

const TRAINERS = [
  {
    id: "trainer-anita",
    name: "Anita Raghavan",
    phone: "+91 98400 11223",
    email: "anita@example.com",
    expertise: "JavaScript, React, system design",
    active: true,
  },
  {
    id: "trainer-imran",
    name: "Imran Sheikh",
    phone: "+91 98400 44556",
    email: "imran@example.com",
    expertise: "Studio lighting, wedding coverage",
    active: true,
  },
];

const BATCHES = [
  {
    id: "batch-mern-a",
    code: "MERN-A",
    courseId: "course-mern",
    trainerId: "trainer-anita",
    startDate: "2026-07-06",
    endDate: "",
    schedule: "Mon/Wed/Fri 7-9pm",
    capacity: 24,
    status: "running",
  },
  {
    id: "batch-photo-weekend",
    code: "PHOTO-WKND",
    courseId: "course-wedding-photo",
    trainerId: "trainer-imran",
    startDate: "2026-08-01",
    endDate: "2026-09-26",
    schedule: "Sat/Sun 10am-1pm",
    capacity: 12,
    status: "running",
  },
  {
    id: "batch-english-eve",
    code: "ENG-EVE",
    courseId: "course-spoken-english",
    trainerId: "trainer-anita",
    startDate: "2026-09-01",
    endDate: "",
    schedule: "Tue/Thu 6-7:30pm",
    capacity: 20,
    status: "upcoming",
  },
];

const STUDENTS = [
  {
    id: "student-ravi",
    name: "Ravi Kumar",
    phone: "+91 90000 10001",
    email: "ravi@example.com",
    courseId: "course-mern",
    batchId: "batch-mern-a",
    enrolledOn: "2026-07-06",
    totalFee: 65000,
    status: "active",
    notes: "Paying in three instalments.",
  },
  {
    id: "student-fatima",
    name: "Fatima Noor",
    phone: "+91 90000 10002",
    email: "fatima@example.com",
    courseId: "course-mern",
    batchId: "batch-mern-a",
    enrolledOn: "2026-07-08",
    // Below the course's 65000 list price on purpose -- exercises the
    // negotiated-fee path (see features/student.js).
    totalFee: 60000,
    status: "active",
    notes: "Referral discount.",
  },
  {
    id: "student-joseph",
    name: "Joseph Antony",
    phone: "+91 90000 10003",
    email: "joseph@example.com",
    courseId: "course-wedding-photo",
    batchId: "batch-photo-weekend",
    enrolledOn: "2026-08-01",
    totalFee: 32000,
    status: "active",
    notes: "",
  },
  {
    id: "student-meera",
    name: "Meera Iyer",
    phone: "+91 90000 10004",
    email: "meera@example.com",
    courseId: "course-wedding-photo",
    batchId: "batch-photo-weekend",
    enrolledOn: "2026-08-03",
    totalFee: 32000,
    status: "active",
    notes: "",
  },
];

// Leaves every student with a balance, so the dashboard's outstanding figure
// and the fees screen both show something meaningful straight after seeding.
const PAYMENTS = [
  {
    id: "payment-ravi-1",
    studentId: "student-ravi",
    batchId: "batch-mern-a",
    amount: 25000,
    mode: "upi",
    paidOn: "2026-07-06",
    note: "Instalment 1",
  },
  {
    id: "payment-ravi-2",
    studentId: "student-ravi",
    batchId: "batch-mern-a",
    amount: 20000,
    mode: "bank",
    paidOn: "2026-08-05",
    note: "Instalment 2",
  },
  {
    id: "payment-fatima-1",
    studentId: "student-fatima",
    batchId: "batch-mern-a",
    amount: 30000,
    mode: "cash",
    paidOn: "2026-07-08",
    note: "Half up front",
  },
  {
    id: "payment-joseph-1",
    studentId: "student-joseph",
    batchId: "batch-photo-weekend",
    amount: 16000,
    mode: "card",
    paidOn: "2026-08-01",
    note: "First half",
  },
];

async function seedDevData() {
  const { user, created } = await auth.ensureUser(DEV_USER);

  const stamp = (rows, uidField) =>
    rows.map(({ id, ...data }) => ({ id, data: { ...data, [uidField]: user.uid } }));

  // Courses and trainers first: features/batch.js and features/student.js both
  // reject a reference to a row that does not exist yet, and seeding in
  // dependency order keeps the fixtures honest against those same rules.
  await db.setCourses(stamp(COURSES, "createdByUid"));
  await db.setTrainers(stamp(TRAINERS, "createdByUid"));
  await db.setBatches(stamp(BATCHES, "createdByUid"));
  await db.setStudents(stamp(STUDENTS, "createdByUid"));
  await db.setPayments(stamp(PAYMENTS, "receivedByUid"));

  // One register for today so the attendance screen is not empty on first
  // visit. Dated from the institute's clock, not UTC (see utils/clock.js).
  // Uses setAttendance rather than a batched write so the `<batchId>_<date>`
  // id convention stays owned by services/database.js -- spelling it out here
  // would be a second copy to keep in sync.
  await db.setAttendance({
    batchId: "batch-mern-a",
    date: today(),
    marks: { "student-ravi": "present", "student-fatima": "absent" },
    markedByUid: user.uid,
  });

  return {
    email: DEV_USER.email,
    password: DEV_USER.password,
    uid: user.uid,
    userCreated: created,
    courses: COURSES.length,
    trainers: TRAINERS.length,
    batches: BATCHES.length,
    students: STUDENTS.length,
    payments: PAYMENTS.length,
    attendanceRegisters: 1,
  };
}

module.exports = { seedDevData, DEV_USER };
