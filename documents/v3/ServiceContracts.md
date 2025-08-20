

# Gym Management System: Service Contract Document
**Group:** Rome was built in a day  
**Project Name:** Gym Manager

**Note:** All services marked as "Authentication: Required" require a valid JWT token in the Authorization header. Services marked as "Authentication: Not required" can be accessed without authentication. Role-based access control is enforced for specific endpoints where indicated.

## 1. Authentication Service

### Service Name: Register 
**Purpose:** Allows users to register on the system  
**Route:** `/register`  
**HTTP Method:** POST  
**Input JSON Body:**
```json
{
  "firstname": "string",
  "lastname": "string", 
  "email": "string",
  "phone": "number",
  "password": "string",
  "roles": "array"
}
```
**Output JSON:**
```json
{
  "token": "string",
  "user": {
    "userId": "number",
    "role": "string"
  }
}
```
**Authentication:** Not required  
**Consumers:** Mobile App

### Service Name Login  
**Purpose:** Authenticates users and issues JWT tokens for secure access  
**Route:** `/login`  
**HTTP Method:** POST  
**Input JSON Body:**
```json
{
  "email": "string",
  "password": "string"
}
```
**Output JSON:**
```json
{
  "token": "string",
  "user": {
    "userId": "number",
    "role": "string"
  }
}
```
**Authentication:** Not required  
**Consumers:** Mobile/Web App

### Service Name Status  
**Purpose:** Retrieves the current user's authentication status and role information  
**Route:** `/status`  
**HTTP Method:** GET  
**Input:** None (user ID derived from JWT token)  
**Output JSON:**
```json
{
  "authenticated": "boolean",
  "user": {
    "userId": "number",
    "roles": "array"
  }
}
```
**Authentication:** Required  
**Consumers:** Mobile/Web App

## 2. Class Management Service

### Service Name Get Coach Assigned Classes  
**Purpose:** Retrieves all classes assigned to a specific coach  
**Route:** `/coach/assigned`  
**HTTP Method:** GET  
**Input:** None (coach ID derived from JWT token)  
**Output JSON:** Array of assigned classes  
**Authentication:** Required (Coach role)  
**Consumers:** Mobile/Web App

### Service Name Get Coach Classes With Workouts  
**Purpose:** Retrieves classes assigned to a coach along with their workout details  
**Route:** `/coach/classes-with-workouts`  
**HTTP Method:** GET  
**Input:** None (coach ID derived from JWT token)  
**Output JSON:** Array of classes with workout information  
**Authentication:** Required (Coach role)  
**Consumers:** Mobile/Web App

### Service Name Assign Workout To Class  
**Purpose:** Assigns a specific workout to a class  
**Route:** `/coach/assign-workout`  
**HTTP Method:** POST  
**Input JSON Body:**
```json
{
  "classId": "number",
  "workoutId": "number"
}
```
**Output JSON:**
```json
{
  "success": "boolean"
}
```
**Authentication:** Required (Coach role)  
**Consumers:** Mobile/Web App

### Service Name Create Workout  
**Purpose:** Creates a new workout with exercises and rounds  
**Route:** `/coach/create-workout`  
**HTTP Method:** POST  
**Input JSON Body:**
```json
{
  "workoutName": "string",
  "type": "FOR_TIME|AMRAP|TABATA|EMOM|INTERVAL",
  "metadata": "object",
  "rounds": "array"
}
```
**Output JSON:** New workout ID  
**Authentication:** Required (Coach role)  
**Consumers:** Mobile/Web App

### Service Name Get All Classes  
**Purpose:** Retrieves all available classes for members  
**Route:** `/classes`  
**HTTP Method:** GET  
**Input:** None  
**Output JSON:** Array of all classes  
**Authentication:** Required  
**Consumers:** Mobile/Web App

### Service Name Get Member Classes  
**Purpose:** Retrieves classes booked by a specific member  
**Route:** `/member/classes`  
**HTTP Method:** GET  
**Input:** None (member ID derived from JWT token)  
**Output JSON:** Array of member's booked classes  
**Authentication:** Required  
**Consumers:** Mobile/Web App

### Service Name Book Class  
**Purpose:** Allows a member to book a class  
**Route:** `/book`  
**HTTP Method:** POST  
**Input JSON Body:**
```json
{
  "classId": "number"
}
```
**Output JSON:** Booking confirmation  
**Authentication:** Required  
**Consumers:** Mobile/Web App

### Service Name Check In To Class  
**Purpose:** Allows members to check in to a booked class  
**Route:** `/checkin`  
**HTTP Method:** POST  
**Input JSON Body:**
```json
{
  "classId": "number",
  "memberId": "number"
}
```
**Output JSON:** Check-in confirmation  
**Authentication:** Not required  
**Consumers:** Mobile/Web App

### Service Name Cancel Booking  
**Purpose:** Allows members to cancel a class booking  
**Route:** `/cancel`  
**HTTP Method:** POST  
**Input JSON Body:**
```json
{
  "classId": "number",
  "memberId": "number"
}
```
**Output JSON:** Cancellation confirmation  
**Authentication:** Not required  
**Consumers:** Mobile/Web App

## 3. Admin Management Service

### Service Name Create Weekly Schedule  
**Purpose:** Creates a weekly schedule with multiple classes  
**Route:** `/schedule/weekly`  
**HTTP Method:** POST  
**Input JSON Body:**
```json
{
  "startDate": "string",
  "createdBy": "number",
  "weeklySchedule": {
    "monday": "array",
    "tuesday": "array",
    "wednesday": "array",
    "thursday": "array",
    "friday": "array",
    "saturday": "array",
    "sunday": "array"
  }
}
```
**Output JSON:**
```json
{
  "success": "boolean",
  "insertedClasses": "array"
}
```
**Authentication:** Required  
**Consumers:** Web App

### Service Name Get Weekly Schedule  
**Purpose:** Retrieves the current weekly schedule  
**Route:** `/schedule/weekly`  
**HTTP Method:** GET  
**Input:** None  
**Output JSON:** Grouped weekly schedule  
**Authentication:** Required  
**Consumers:** Web App

### Service Name Create Class  
**Purpose:** Creates a new class in the system  
**Route:** `/class`  
**HTTP Method:** POST  
**Input JSON Body:**
```json
{
  "capacity": "number",
  "scheduledDate": "string",
  "scheduledTime": "string",
  "durationMinutes": "number",
  "coachId": "number",
  "workoutId": "number",
  "createdBy": "number"
}
```
**Output JSON:** Created class details  
**Authentication:** Required  
**Consumers:** Web App

### Service Name Assign Coach  
**Purpose:** Assigns a coach to a specific class  
**Route:** `/assign-coach`  
**HTTP Method:** POST  
**Input JSON Body:**
```json
{
  "classId": "number",
  "coachId": "number"
}
```
**Output JSON:**
```json
{
  "success": "boolean"
}
```
**Authentication:** Required  
**Consumers:** Web App

### Service Name Assign User To Role  
**Purpose:** Assigns a specific role to a user  
**Route:** `/assign-role`  
**HTTP Method:** POST  
**Input JSON Body:**
```json
{
  "userId": "number",
  "role": "coach|member|admin|manager"
}
```
**Output JSON:**
```json
{
  "success": "boolean"
}
```
**Authentication:** Required  
**Consumers:** Web App

### Service Name Get All Members  
**Purpose:** Retrieves all members in the system  
**Route:** `/members`  
**HTTP Method:** GET  
**Input:** None  
**Output JSON:** Array of all members  
**Authentication:** Required  
**Consumers:** Web App

### Service Name Get Users By Role  
**Purpose:** Retrieves all users with a specific role  
**Route:** `/users/role/:role`  
**HTTP Method:** GET  
**Input:** Role parameter in URL  
**Output JSON:** Array of users with specified role  
**Authentication:** Required  
**Consumers:** Web App

### Service Name Get All Users  
**Purpose:** Retrieves all users in the system  
**Route:** `/users`  
**HTTP Method:** GET  
**Input:** None  
**Output JSON:** Array of all users  
**Authentication:** Required  
**Consumers:** Web App

### Service Name Get User By ID  
**Purpose:** Retrieves a specific user by their ID  
**Route:** `/users/:userId`  
**HTTP Method:** GET  
**Input:** User ID parameter in URL  
**Output JSON:** User details  
**Authentication:** Required  
**Consumers:** Web App

### Service Name Update User By ID  
**Purpose:** Updates user information  
**Route:** `/users/:userId`  
**HTTP Method:** PUT  
**Input JSON Body:**
```json
{
  "updates": {
    "firstName": "string",
    "lastName": "string",
    "email": "string",
    "phone": "string",
    "bio": "string",
    "authorisation": "string",
    "status": "string",
    "creditsBalance": "number"
  }
}
```
**Output JSON:** Updated user details  
**Authentication:** Required  
**Consumers:** Web App

### Service Name Get Roles By User ID  
**Purpose:** Retrieves all roles assigned to a specific user  
**Route:** `/users/:userId/roles`  
**HTTP Method:** GET  
**Input:** User ID parameter in URL  
**Output JSON:** Array of user roles  
**Authentication:** Required  
**Consumers:** Web App

### Service Name Remove Coach Role  
**Purpose:** Removes coach role from a user  
**Route:** `/remove-coach-role`  
**HTTP Method:** POST  
**Input JSON Body:**
```json
{
  "userId": "number"
}
```
**Output JSON:** Role removal confirmation  
**Authentication:** Required  
**Consumers:** Web App

### Service Name Remove Member Role  
**Purpose:** Removes member role from a user  
**Route:** `/remove-member-role`  
**HTTP Method:** POST  
**Input JSON Body:**
```json
{
  "userId": "number"
}
```
**Output JSON:** Role removal confirmation  
**Authentication:** Required  
**Consumers:** Web App

### Service Name Remove Admin Role  
**Purpose:** Removes admin role from a user  
**Route:** `/remove-admin-role`  
**HTTP Method:** POST  
**Input JSON Body:**
```json
{
  "userId": "number"
}
```
**Output JSON:** Role removal confirmation  
**Authentication:** Required  
**Consumers:** Web App

### Service Name Remove Manager Role  
**Purpose:** Removes manager role from a user  
**Route:** `/remove-manager-role`  
**HTTP Method:** POST  
**Input JSON Body:**
```json
{
  "userId": "number"
}
```
**Output JSON:** Role removal confirmation  
**Authentication:** Required  
**Consumers:** Web App

## 4. Live Class Service

### Service Name Get Live Class  
**Purpose:** Retrieves live class information for a user  
**Route:** `/live/class`  
**HTTP Method:** GET  
**Input:** None (user ID derived from JWT token)  
**Output JSON:** Live class details  
**Authentication:** Required  
**Consumers:** Mobile/Web App

### Service Name Get Live Session  
**Purpose:** Retrieves live session details for a specific class  
**Route:** `/live/:classId/session`  
**HTTP Method:** GET  
**Input:** Class ID parameter in URL  
**Output JSON:** Live session details  
**Authentication:** Required  
**Consumers:** Mobile/Web App

### Service Name Get Workout Steps  
**Purpose:** Retrieves workout steps for a specific workout  
**Route:** `/workout/:workoutId/steps`  
**HTTP Method:** GET  
**Input:** Workout ID parameter in URL  
**Output JSON:** Workout steps array  
**Authentication:** Required  
**Consumers:** Mobile/Web App

### Service Name Get Leaderboard  
**Purpose:** Retrieves final leaderboard for a class  
**Route:** `/leaderboard/:classId`  
**HTTP Method:** GET  
**Input:** Class ID parameter in URL  
**Output JSON:** Class leaderboard  
**Authentication:** Required  
**Consumers:** Mobile/Web App

### Service Name Get Realtime Leaderboard  
**Purpose:** Retrieves real-time leaderboard for a live class  
**Route:** `/live/:classId/leaderboard`  
**HTTP Method:** GET  
**Input:** Class ID parameter in URL  
**Output JSON:** Real-time leaderboard  
**Authentication:** Required  
**Consumers:** Mobile/Web App

### Service Name Get My Progress  
**Purpose:** Retrieves current user's progress in a live class  
**Route:** `/live/:classId/me`  
**HTTP Method:** GET  
**Input:** Class ID parameter in URL  
**Output JSON:** User's progress  
**Authentication:** Required  
**Consumers:** Mobile/Web App

### Service Name Submit Score  
**Purpose:** Submits a score for a live class workout  
**Route:** `/submitScore`  
**HTTP Method:** POST  
**Input JSON Body:** Score submission data  
**Output JSON:** Score submission confirmation  
**Authentication:** Required  
**Consumers:** Mobile/Web App

### Service Name Start Live Class  
**Purpose:** Starts a live class session (Coach only)  
**Route:** `/coach/live/:classId/start`  
**HTTP Method:** POST  
**Input:** Class ID parameter in URL  
**Output JSON:**
```json
{
  "ok": "boolean",
  "session": "object"
}
```
**Authentication:** Required (Coach role)  
**Consumers:** Mobile/Web App

### Service Name Stop Live Class  
**Purpose:** Stops a live class session (Coach only)  
**Route:** `/coach/live/:classId/stop`  
**HTTP Method:** POST  
**Input:** Class ID parameter in URL  
**Output JSON:**
```json
{
  "ok": "boolean",
  "classId": "number"
}
```
**Authentication:** Required (Coach role)  
**Consumers:** Mobile/Web App

### Service Name Pause Live Class  
**Purpose:** Pauses a live class session (Coach only)  
**Route:** `/coach/live/:classId/pause`  
**HTTP Method:** POST  
**Input:** Class ID parameter in URL  
**Output JSON:**
```json
{
  "ok": "boolean",
  "classId": "number"
}
```
**Authentication:** Required (Coach role)  
**Consumers:** Mobile/Web App

### Service Name Resume Live Class  
**Purpose:** Resumes a paused live class session (Coach only)  
**Route:** `/coach/live/:classId/resume`  
**HTTP Method:** POST  
**Input:** Class ID parameter in URL  
**Output JSON:**
```json
{
  "ok": "boolean",
  "classId": "number"
}
```
**Authentication:** Required (Coach role)  
**Consumers:** Mobile/Web App

### Service Name Advance Progress  
**Purpose:** Advances user's progress in a live class workout  
**Route:** `/live/:classId/advance`  
**HTTP Method:** POST  
**Input:** Class ID parameter in URL  
**Output JSON:** Progress advancement confirmation  
**Authentication:** Required  
**Consumers:** Mobile/Web App

### Service Name Submit Partial  
**Purpose:** Submits partial progress for a workout  
**Route:** `/live/:classId/partial`  
**HTTP Method:** POST  
**Input:** Class ID parameter in URL  
**Output JSON:** Partial submission confirmation  
**Authentication:** Required  
**Consumers:** Mobile/Web App

### Service Name Post Interval Score  
**Purpose:** Posts a score for an interval workout  
**Route:** `/live/:classId/interval/score`  
**HTTP Method:** POST  
**Input:** Class ID parameter in URL  
**Output JSON:** Interval score confirmation  
**Authentication:** Required  
**Consumers:** Mobile/Web App

### Service Name Get Interval Leaderboard  
**Purpose:** Retrieves leaderboard for interval workouts  
**Route:** `/live/:classId/interval/leaderboard`  
**HTTP Method:** GET  
**Input:** Class ID parameter in URL  
**Output JSON:** Interval leaderboard  
**Authentication:** Required  
**Consumers:** Mobile/Web App

## 5. User Settings Service

### Service Name Get User Settings  
**Purpose:** Retrieves user's privacy and visibility settings  
**Route:** `/user/settings`  
**HTTP Method:** GET  
**Input:** None (user ID derived from JWT token)  
**Output JSON:**
```json
{
  "success": "boolean",
  "settings": {
    "publicVisibility": "boolean"
  }
}
```
**Authentication:** Required  
**Consumers:** Mobile/Web App

### Service Name Edit Settings  
**Purpose:** Updates user's privacy and visibility settings  
**Route:** `/user/settings/visibility`  
**HTTP Method:** POST  
**Input JSON Body:**
```json
{
  "publicVisibility": "boolean"
}
```
**Output JSON:**
```json
{
  "success": "boolean",
  "userId": "number",
  "publicVisibility": "boolean"
}
```
**Authentication:** Required  
**Consumers:** Mobile/Web App

## 6. Health Check Service

### Service Name Health Check  
**Purpose:** Checks the health status of the system and database  
**Route:** `/health`  
**HTTP Method:** GET  
**Input:** None  
**Output JSON:**
```json
{
  "ok": "boolean",
  "uptime": "number",
  "db": "string",
  "timestamp": "string"
}
```
**Authentication:** Not required  
**Consumers:** System monitoring, Load balancers

---

```json
{
  "firstname": "string",
  "lastname": "string", 
  "email": "string",
  "phone": "number",
  "password": "string",
  "roles": "array"
}
```

```json
{
  "token": "string",
  "user": {
    "userId": "number",
    "role": "string"
  }
}
```

```json
{
  "email": "string",
  "password": "string"
}
```

```json
{
  "token": "string",
  "user": {
    "userId": "number",
    "role": "string"
  }
}
```

```json
{
  "authenticated": "boolean",
  "user": {
    "userId": "number",
    "roles": "array"
  }
}
```

```json
{
  "classId": "number",
  "workoutId": "number"
}
```

```json
{
  "success": "boolean"
}
```

```json
{
  "workoutName": "string",
  "type": "FOR_TIME|AMRAP|TABATA|EMOM|INTERVAL",
  "metadata": "object",
  "rounds": "array"
}
```

```json
{
  "classId": "number"
}
```

```json
{
  "classId": "number",
  "memberId": "number"
}
```

```json
{
  "classId": "number",
  "memberId": "number"
}
```

```json
{
  "startDate": "string",
  "createdBy": "number",
  "weeklySchedule": {
    "monday": "array",
    "tuesday": "array",
    "wednesday": "array",
    "thursday": "array",
    "friday": "array",
    "saturday": "array",
    "sunday": "array"
  }
}
```

```json
{
  "success": "boolean",
  "insertedClasses": "array"
}
```

```json
{
  "capacity": "number",
  "scheduledDate": "string",
  "scheduledTime": "string",
  "durationMinutes": "number",
  "coachId": "number",
  "workoutId": "number",
  "createdBy": "number"
}
```

```json
{
  "classId": "number",
  "coachId": "number"
}
```

```json
{
  "success": "boolean"
}
```

```json
{
  "userId": "number",
  "role": "coach|member|admin|manager"
}
```

```json
{
  "success": "boolean"
}
```

```json
{
  "updates": {
    "firstName": "string",
    "lastName": "string",
    "email": "string",
    "phone": "string",
    "bio": "string",
    "authorisation": "string",
    "status": "string",
    "creditsBalance": "number"
  }
}
```

```json
{
  "userId": "number"
}
```

```json
{
  "userId": "number"
}
```

```json
{
  "userId": "number"
}
```

```json
{
  "userId": "number"
}
```

```json
{
  "ok": "boolean",
  "session": "object"
}
```

```json
{
  "ok": "boolean",
  "classId": "number"
}
```

```json
{
  "ok": "boolean",
  "classId": "number"
}
```

```json
{
  "ok": "boolean",
  "classId": "number"
}
```

```json
{
  "success": "boolean",
  "settings": {
    "publicVisibility": "boolean"
  }
}
```

```json
{
  "publicVisibility": "boolean"
}
```

```json
{
  "success": "boolean",
  "userId": "number",
  "publicVisibility": "boolean"
}
```

```json
{
  "ok": "boolean",
  "uptime": "number",
  "db": "string",
  "timestamp": "string"
}
```

