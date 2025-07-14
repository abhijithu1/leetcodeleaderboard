# Product Requirements Document (PRD)

## Project: LeetCode Leaderboard Web App

---

## 1. Overview

The LeetCode Leaderboard Web App enables users to create an account, upload an Excel sheet containing a list of names and LeetCode usernames, and visualize a leaderboard for the group. The app fetches user statistics from the [alfa-leetcode-api](https://alfa-leetcode-api.onrender.com/) and displays graphical data for comparison. Authentication is managed via Clerk, and Supabase is used for data storage.

---

## 2. Goals & Objectives

- Allow users to create and manage groups of LeetCode users.
- Enable uploading of Excel files with group member data.
- Fetch and display LeetCode statistics for all group members.
- Provide interactive, graphical leaderboards and analytics.
- Ensure secure authentication and data privacy.

---

## 3. User Personas

- **Admin/Main User:** Authenticated user who creates and manages groups, uploads and manages group member data, and shares the leaderboard via a public link. Has full control over group membership and visibility.
- **Guest:** Anyone with the public link can view the leaderboard (read-only access). No authentication or data stored for guests.

---

## 4. User Stories

### Core
- As an admin, I want to add or remove users from my group after creation.
- As an admin, I want to share my group leaderboard via a public link so others can view it.
- As a guest, I want to view the leaderboard when the admin shares the link with me.
- As a user, I want to sign up and log in securely.
- As a user, I want to upload an Excel sheet with Name and LeetCode Username columns.
- As a user, I want to see a leaderboard of my group based on LeetCode stats.
- As a user, I want to view graphical analytics (charts, graphs) of group performance.
- As a user, I want to manage (edit/delete) my uploaded groups.
- As a user, I want to refresh/re-fetch stats for my group.

### Optional/Stretch
- As a user, I want to invite others to view or join my group.
- As a user, I want to make my group leaderboard public/private.
- As a user, I want to export leaderboard data.

---

## 5. Functional Requirements

### 5.1 Authentication
- Use Clerk for user authentication (sign up, log in, password reset, social logins).
- Only authenticated users can create/manage groups.

### 5.2 Group Management
- Admin can create a new group by uploading an Excel file (Name, LeetCode Username).
- Store group metadata and member list in Supabase.
- List all groups created by the admin.
- Edit group (change name, update members by re-uploading file, or add/remove individual members after creation).
- Delete group.
- Share group leaderboard via a public link (read-only access for guests).

### 5.3 Excel Upload & Parsing
- Accept .xlsx and .csv files.
- Validate file format and required columns.
- Parse and display preview before saving.
- Handle errors (missing columns, invalid usernames, duplicates).

### 5.4 LeetCode Data Integration
- For each group member, fetch stats from alfa-leetcode-api using their LeetCode username.
- Store fetched stats in Supabase (with timestamp for caching).
- Allow manual refresh of stats (with rate limiting).

### 5.5 Leaderboard & Analytics
- Display leaderboard table (sortable by various stats: problems solved, contest rating, etc.).
- Show graphical analytics (bar charts, line graphs, pie charts) for:
  - Problems solved (total, by difficulty)
  - Contest ratings
  - Submission activity (calendar)
  - Language/skill stats
- Responsive, modern UI.

### 5.6 Notifications & Feedback
- Show success/error messages for uploads, fetches, etc.
- Indicate loading states during data fetch.

### 5.7 Security & Privacy
- Only admin can view/edit their groups and manage membership.
- Anyone with the public link can view the leaderboard (read-only, as guest).
- Secure storage of user and group data.

---

## 6. Non-Functional Requirements

- **Performance:** Fast data fetch and rendering for groups up to 100 users.
- **Scalability:** Support for multiple concurrent users and groups.
- **Reliability:** Handle API failures gracefully, retry logic, and error reporting.
- **Accessibility:** WCAG 2.1 AA compliance.
- **Responsiveness:** Mobile, tablet, and desktop support.

---

## 7. Data Model

### 7.1 User (Admin, via Clerk)
- id
- email
- name
- created_at

### 7.2 Group (Supabase)
- id
- owner_id (User.id, the admin)
- name
- created_at
- is_public (bool)
- public_link (string, unique, for sharing)

### 7.3 GroupMember (Supabase)
- id
- group_id (Group.id)
- display_name
- leetcode_username
- created_at

### 7.4 LeetCodeStats (Supabase)
- id
- group_member_id (GroupMember.id)
- fetched_at
- profile_data (JSON)
- problems_solved (int)
- contest_rating (float)
- language_stats (JSON)
- skill_stats (JSON)
- submission_calendar (JSON)

---

## 8. API Integrations

### 8.1 alfa-leetcode-api Endpoints Used
- `/userProfile/:username` (full profile)
- `/userProfileCalendar?username=...&year=...` (calendar)
- `/languageStats?username=...` (language stats)
- `/skillStats/:username` (skill stats)
- `/userContestRankingInfo/:username` (contest ranking)
- `/problems?username=...` (problem stats)

### 8.2 Supabase
- Store users, groups, members, and stats.
- Row-level security for user data.

### 8.3 Clerk
- Authentication and user management.

---

## 9. User Flows

### 9.1 Sign Up / Login
1. User lands on homepage.
2. Clicks Sign Up / Login (Clerk modal).
3. Authenticated and redirected to dashboard.

### 9.2 Create Group & Upload Excel
1. Click "Create Group".
2. Enter group name.
3. Upload Excel file.
4. Preview parsed data.
5. Confirm and save group.
6. App fetches LeetCode stats for each member.
7. Redirect to group leaderboard page.
8. Admin can add or remove members individually after group creation.

### 9.3 View Leaderboard
1. Select group from dashboard.
2. View sortable leaderboard table.
3. View analytics (charts, graphs).
4. Option to refresh stats.

### 9.4 Edit/Delete Group
1. From dashboard, select group.
2. Edit group name or re-upload member list.
3. Or delete group (confirmation required).

### 9.5 Share Leaderboard
1. Admin clicks "Share" on the group leaderboard page.
2. App generates a public link (if not already created).
3. Admin copies and shares the link with anyone.
4. Anyone with the link can view the leaderboard (read-only).

---

## 10. UI/UX Requirements

- Modern, clean, and intuitive interface.
- Use charts (bar, line, pie) for analytics (e.g., Chart.js, Recharts, or similar).
- Responsive design for all devices.
- Accessible color palette and font sizes.
- Clear feedback for all actions (upload, fetch, errors).
- Loading indicators for data fetches.
- Clerk authentication modals.
- Excel upload with drag-and-drop and file picker.
- Group dashboard with cards/list view.
- Leaderboard page with table and analytics tabs.
- Admin dashboard includes options to add/remove group members after group creation.
- "Share" button on leaderboard page to generate/copy public link.
- Public leaderboard page is read-only and accessible to anyone with the link.

---

## 11. Stretch Features (Optional)

- Invite group members via email.
- Public/private group sharing links.
- Export leaderboard as CSV/Excel.
- Scheduled automatic stats refresh.
- Notification emails for group updates.
- Customizable leaderboard metrics.

---

## 12. Milestones & Timeline

1. **Project Setup & Auth Integration**
2. **Excel Upload & Parsing**
3. **Supabase Data Model & API Integration**
4. **LeetCode API Integration**
5. **Leaderboard & Analytics UI**
6. **Group Management Features**
7. **Testing & QA**
8. **Deployment & Documentation**

---

## 13. Risks & Mitigations

- **LeetCode API Rate Limits:** Implement caching and manual refresh with cooldown.
- **Excel Parsing Errors:** Robust validation and user feedback.
- **Data Privacy:** Use row-level security and authenticated access.
- **API Downtime:** Graceful error handling and retry logic.

---

## 14. References

- [alfa-leetcode-api Documentation](./leet.md)
- [Clerk Documentation](https://clerk.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [LeetCode](https://leetcode.com/)

---

*This PRD is a living document and should be updated as requirements evolve.* 