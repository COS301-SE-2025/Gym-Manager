
# 🧾 Gym Management API – Service Contract

## Summary
This document outlines the available API service methods, their expected request and response structures, and the side effects they have on the database. It serves as a clear guide for client applications and developers to understand how to interact with the backend system.

---

## 👤 Authenticated User Context
All endpoints assume the request comes from an authenticated user (`req.user`), with the following structure:

```ts
req.user = {
  userId: string; // UUID of the authenticated user
  role: 'coach' | 'member';
}
```

---

## 📘 ClassService Endpoints

### 1. `GET /api/classes/coach`

**Description**: Fetch all classes assigned to the authenticated coach.

**Request**:
- Headers: `Authorization: Bearer <token>`

**Response**:
```json
[
  {
    "classId": string,
    "coachId": string,
    "scheduledDate": string,
    "scheduledTime": string,
    "capacity": number,
    "workoutId": string | null
  }
]
```

**Effect**: None (read-only). Returns all classes where `coachId = req.user.userId`.

---

### 2. `GET /api/classes/coach/workouts`

**Description**: Fetch classes assigned to a coach along with their associated workouts.

**Request**:
- Headers: `Authorization: Bearer <token>`

**Response**:
```json
[
  {
    "classId": string,
    "scheduledDate": string,
    "scheduledTime": string,
    "workoutName": string | null,
    "workoutContent": string | null
  }
]
```

**Effect**: None (read-only). Performs a `LEFT JOIN` with `workouts` on coach’s classes.

---

### 3. `POST /api/classes/coach/assign-workout`

**Description**: Assign a workout to a class owned by the coach.

**Request**:
```json
{
  "classId": string,
  "workoutId": string
}
```

**Response**:
```json
{ "success": true }
```

**Effect**:
- Verifies coach owns the class
- Updates the `classes` table to set `workoutId` for the specified class

---

### 4. `GET /api/classes/member`

**Description**: Fetch all classes the member has booked.

**Request**:
- Headers: `Authorization: Bearer <token>`

**Response**:
```json
[
  {
    "bookingId": string,
    "classId": string,
    "scheduledDate": string,
    "scheduledTime": string,
    "workoutName": string | null
  }
]
```

**Effect**: None (read-only). Performs an `INNER JOIN` of `classbookings` and `classes`.

---

### 5. `POST /api/classes/member/book`

**Description**: Book a class as a member.

**Request**:
```json
{
  "classId": string
}
```

**Response (Success)**:
```json
{ "success": true }
```

**Response (Error Examples)**:
- 403: `{ "error": "Membership not approved" }`
- 404: `{ "error": "Class not found" }`
- 400: `{ "error": "Already booked" }`
- 400: `{ "error": "Class full" }`

**Effect**:
- Checks:
  - Member is approved
  - Class exists and has space
  - Member hasn't already booked
- Inserts a new entry in `classbookings`

---

## 🛠️ Entity Overview

| Table          | Key Fields              | Purpose                            |
|----------------|-------------------------|-------------------------------------|
| `users`        | `userId`, `email`       | Authenticated users (shared ID)     |
| `coaches`      | `userId`                | Extended data for coaches           |
| `members`      | `userId`, `status`      | Extended data for members           |
| `classes`      | `classId`, `coachId`    | Defines class schedule              |
| `workouts`     | `workoutId`, `name`     | Workout content                     |
| `classbookings`| `bookingId`, `classId`  | Tracks class bookings by members    |
| `userroles`    | `userId`, `role`        | Maps users to roles                 |
