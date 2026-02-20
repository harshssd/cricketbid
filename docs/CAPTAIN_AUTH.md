# Team Admin Authentication System

## Overview

The team admin authentication system allows multiple authorized users to access each team's bidding interface and place bids during auctions. This flexible, multi-admin system provides secure, role-based access control with multiple authorization levels.

## Authentication Flow

### 1. User Authentication (Supabase)
- Users must log in with their Supabase account
- Middleware validates the session and extracts user information
- User ID and email are passed to API routes via headers (`x-user-id`, `x-user-email`)

### 2. Multi-Level Team Authorization
The system checks multiple sources for team access authorization:

#### Level 1: Team Captain
- User assigned as team captain in `teams.captainId` field
- Highest level of team authority

#### Level 2: Team Members with Admin Roles
- Users added to team with `CAPTAIN` or `VICE_CAPTAIN` roles in `team_members` table
- Configurable through the team admin management interface

#### Level 3: Auction-Level Admin Access
- Users with `OWNER`, `MODERATOR`, or `CAPTAIN` roles in auction participation
- Provides cross-team administrative access

### 3. Flexible Team Access
- Each team gets a unique URL: `/captain/{auctionId}-{teamId}`
- Multiple authorized users can access the same team's bidding interface
- System validates team membership and authorization on every request

## Database Schema

### Key Relationships
```sql
-- Users table
model User {
  id                String   @id @default(cuid())
  email             String   @unique
  name              String
  captainedTeams    Team[]   @relation("TeamCaptain")
  bids              Bid[]
  -- other fields...
}

-- Teams table
model Team {
  id        String  @id @default(cuid())
  name      String
  captainId String? @map("captain_id")
  captain   User?   @relation("TeamCaptain", fields: [captainId], references: [id])
  auction   Auction @relation(fields: [auctionId], references: [id])
  -- other fields...
}

-- Bids table
model Bid {
  id        String @id @default(cuid())
  captainId String @map("captain_id")
  captain   User   @relation(fields: [captainId], references: [id])
  -- other fields...
}
```

## API Endpoints

### 1. Captain Session API
**Endpoint:** `GET /api/captain/[sessionId]`

**Purpose:** Fetch captain's auction session data

**Authentication:**
- ✅ Supabase session required
- ✅ Captain authorization required
- ✅ Team ownership validation

**Response:** Captain's team data, current round, bidding status

### 2. Captain Bidding API
**Endpoint:** `POST /api/captain/[sessionId]/bid`

**Purpose:** Submit bids for players

**Authentication:**
- ✅ Supabase session required
- ✅ Multi-level team admin authorization
- ✅ Team ownership validation
- ✅ Auction status validation

**Request Body:**
```json
{
  "roundId": "string",
  "playerId": "string",
  "amount": number
}
```

### 3. Team Admin Management API
**Endpoint:** `GET/POST/DELETE /api/auctions/[id]/teams/[teamId]/admins`

**Purpose:** Manage team administrators who can access bidding interface

**GET - List Admins:**
- Returns all users with admin access to the team
- Shows source of access (team captain, team member, auction admin)

**POST - Add Admin:**
```json
{
  "userEmail": "admin@example.com",
  "role": "VICE_CAPTAIN" // or "CAPTAIN"
}
```

**DELETE - Remove Admin:**
```json
{
  "userId": "user-id-to-remove"
}
```

## Security Features

### 1. Multi-Layer Authentication
- **Session Layer:** Supabase authentication
- **Authorization Layer:** Captain-team relationship verification
- **Context Layer:** Auction and round validation

### 2. Error Handling
- **401 Unauthorized:** User not logged in
- **403 Forbidden:** User not authorized for this team
- **404 Not Found:** Team/auction not found
- **400 Bad Request:** Invalid data or missing captain assignment

### 3. Detailed Error Messages
```json
{
  "error": "Access denied - you are not authorized to access this team",
  "details": "You are logged in as captain@email.com, but this team's captain is other@email.com. Please log in with the correct captain account.",
  "currentUser": "captain@email.com",
  "expectedCaptain": "other@email.com"
}
```

## Usage Examples

### 1. Setting Up Team Captains
```typescript
// In team creation/management
await prisma.team.update({
  where: { id: teamId },
  data: {
    captainId: userId // Link user as team captain
  }
})
```

### 2. Generating Captain URLs
```typescript
// In auction setup interface
const captainUrl = `${baseUrl}/captain/${auctionId}-${teamId}`
```

### 3. Verifying Captain Access
```typescript
import { verifyCaptainAccess, getAuthenticatedUser } from '@/lib/auth'

// In API routes
const { userId, userEmail } = getAuthenticatedUser(request)
const authResult = await verifyCaptainAccess(userId, userEmail, teamId, auctionId)

if (!authResult.success) {
  return NextResponse.json(
    { error: authResult.error },
    { status: authResult.statusCode }
  )
}
```

## Testing

### Test Endpoint
**Endpoint:** `POST /api/test-captain-auth`

**Body:**
```json
{
  "sessionId": "auctionId-teamId"
}
```

**Purpose:** Test captain authentication for a given session ID

### Manual Testing Steps
1. Create an auction with teams
2. Assign captains to teams (users with accounts)
3. Generate captain URLs from the setup interface
4. Log in as the captain and access the URL
5. Verify access is granted only to the correct captain
6. Test bidding functionality

## Best Practices

### 1. Captain Assignment
- Ensure captains have valid user accounts before assignment
- Verify email addresses match between user accounts and captain assignments
- Use clear naming conventions for team captain roles

### 2. URL Sharing
- Share captain URLs only with the designated team captains
- Include instructions for captains to log in with their assigned accounts
- Provide clear error messages when authorization fails

### 3. Error Handling
- Always check authentication before performing captain-specific actions
- Provide helpful error messages that guide users to the correct solution
- Log authentication failures for security monitoring

## Security Considerations

### 1. Session Security
- Supabase handles session management and security
- Sessions expire automatically based on Supabase configuration
- No manual session management required

### 2. Authorization Security
- Captain authorization is checked on every request
- No caching of authorization decisions
- Database queries verify current captain assignments

### 3. URL Security
- URLs contain team IDs but require authentication to access
- No sensitive data exposed in URLs
- Authorization prevents unauthorized access even with URL knowledge

## Troubleshooting

### Common Issues

**1. "No captain assigned to this team"**
- Ensure the team has a captain assigned in the database
- Check that `teams.captainId` is properly set

**2. "Access denied - you are not authorized"**
- User is logged in but not the assigned captain
- Check that the user account matches the assigned captain
- Verify the captain assignment in the team settings

**3. "Authentication required"**
- User is not logged in
- Session has expired
- Redirect user to login page

**4. "Team not found"**
- Invalid sessionId format
- Team was deleted or doesn't exist
- Auction doesn't exist or team doesn't belong to auction