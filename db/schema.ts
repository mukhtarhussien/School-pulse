import { relations, sql } from 'drizzle-orm'
import {
  boolean,
  check,
  date,
  integer,
  jsonb,
  index,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'

export const userRole = pgEnum('user_role', [
  'student',
  'teacher',
  'school_admin',
  'admin',
])

export const communityScope = pgEnum('community_scope', ['school', 'platform'])
export const messageChannel = pgEnum('message_channel', ['school', 'social'])
export const schoolInviteRole = pgEnum('school_invite_role', ['student', 'teacher', 'school_admin'])

export const audience = pgEnum('audience', [
  'all',
  'students',
  'teachers',
  'admins',
  'class',
])

export const assessmentType = pgEnum(
  'assessment_type',
  [
    'exam',
    'quiz',
    'assignment',
    'project',
    'participation',
  ]
)

export const messageStatus = pgEnum(
  'message_status',
  [
    'pending',
    'accepted',
    'rejected',
    'read',
  ]
)

export const attendanceStatus = pgEnum(
  'attendance_status',
  [
    'present',
    'late',
    'absent',
    'excused',
  ]
)

export const registrationStatus = pgEnum(
  'registration_status',
  [
    'draft',
    'pending',
    'approved',
    'rejected',
  ]
)

const timestamps = {
  createdAt: timestamp('created_at', {
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),

  updatedAt: timestamp('updated_at', {
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),
}

export const schools = pgTable('schools', {
  id: uuid('id').defaultRandom().primaryKey(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  nameAr: varchar('name_ar', { length: 180 }).notNull(),
  nameEn: varchar('name_en', { length: 180 }).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  ...timestamps,
})

export const classes = pgTable(
  'classes',
  {
    schoolId: uuid('school_id').references(() => schools.id, { onDelete: 'cascade' }).notNull(),
    id: uuid('id')
      .defaultRandom()
      .primaryKey(),

    nameAr: varchar('name_ar', {
      length: 120,
    }).notNull(),

    nameEn: varchar('name_en', {
      length: 120,
    }).notNull(),

    gradeLevel: integer(
      'grade_level'
    ).notNull(),

    section: varchar('section', {
      length: 40,
    }),

    room: varchar('room', {
      length: 80,
    }),

    capacity: integer('capacity'),

    ...timestamps,
  },
  (t) => ({ schoolIdx: index('classes_school_idx').on(t.schoolId, t.gradeLevel, t.section) })
)

export type UserPreferences = {
  notificationsMuted?: boolean
  blockedUserIds?: string[]
  profilePhotoKey?: string
  language?: 'ar' | 'ckb' | 'en'
  socialEnabled?: boolean
  socialMessageAudience?: 'contacts' | 'school' | 'platform'
  appearance?: { fontFamily: string; fontSize: number; cardSize: 'small' | 'medium' | 'large'; accentColor?: string; theme?: 'light' | 'dark' | 'system' }
}

export const users = pgTable(
  'users',
  {
    schoolId: uuid('school_id').references(() => schools.id, { onDelete: 'set null' }),
    id: uuid('id')
      .defaultRandom()
      .primaryKey(),

    email: varchar('email', {
      length: 320,
    })
      .notNull()
      .unique(),

    passwordHash: text(
      'password_hash'
    ),

    username: varchar('username', { length: 32 }),

    fullNameAr: varchar(
      'full_name_ar',
      {
        length: 160,
      }
    ).notNull(),

    fullNameEn: varchar(
      'full_name_en',
      {
        length: 160,
      }
    ).notNull(),

    role: userRole('role')
      .default('student')
      .notNull(),

    studentNumber: varchar(
      'student_number',
      {
        length: 60,
      }
    ),

    phone: varchar('phone', {
      length: 40,
    }),

    birthDate: date('birth_date'),

    googleSubject: varchar(
      'google_subject',
      {
        length: 255,
      }
    ),

    isActive: boolean('is_active')
      .default(true)
      .notNull(),

    twoFactorEnabled: boolean(
      'two_factor_enabled'
    )
      .default(false)
      .notNull(),

    twoFactorSecretEncrypted:
      text(
        'two_factor_secret_encrypted'
      ),

    twoFactorRecoveryCodes:
      jsonb(
        'two_factor_recovery_codes'
      )
        .$type<string[]>()
        .default(
          sql`'[]'::jsonb`
        )
        .notNull(),

    classId: uuid('class_id').references(
      () => classes.id,
      {
        onDelete: 'set null',
      }
    ),

    preferences: jsonb('preferences')
      .$type<UserPreferences>()
      .default(sql`'{}'::jsonb`)
      .notNull(),

    ...timestamps,
  },
  (t) => ({
    studentNumberIdx:
      uniqueIndex(
        'users_student_number_idx'
      ).on(t.studentNumber),
    usernameIdx: uniqueIndex('users_username_idx').on(t.username),
    schoolRoleIdx: index('users_school_role_idx').on(t.schoolId, t.role, t.isActive),
    usernameMinLengthCheck: check('users_username_min_length_check', sql`${t.username} is null or char_length(${t.username}) >= 5`),
  })
)

export const schoolInvites = pgTable(
  'school_invites',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    schoolId: uuid('school_id').references(() => schools.id, { onDelete: 'cascade' }).notNull(),
    role: schoolInviteRole('role').notNull(),
    codeHash: varchar('code_hash', { length: 64 }).notNull().unique(),
    maxUses: integer('max_uses').default(1).notNull(),
    uses: integer('uses').default(0).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    ...timestamps,
  },
  (t) => ({ schoolIdx: index('school_invites_school_idx').on(t.schoolId, t.role, t.expiresAt) }),
)

export const teachers = pgTable(
  'teachers',
  {
    id: uuid('id')
      .defaultRandom()
      .primaryKey(),

    userId: uuid('user_id')
      .references(
        () => users.id,
        {
          onDelete: 'cascade',
        }
      )
      .notNull()
      .unique(),

    employeeCode: varchar(
      'employee_code',
      {
        length: 80,
      }
    )
      .notNull()
      .unique(),

    department: varchar(
      'department',
      {
        length: 120,
      }
    ),

    titleAr: varchar('title_ar', {
      length: 120,
    }),

    titleEn: varchar('title_en', {
      length: 120,
    }),

    ...timestamps,
  }
)

export const subjects = pgTable(
  'subjects',
  {
    schoolId: uuid('school_id').references(() => schools.id, { onDelete: 'cascade' }).notNull(),
    id: uuid('id')
      .defaultRandom()
      .primaryKey(),

    code: varchar('code', {
      length: 40,
    }).notNull(),

    nameAr: varchar('name_ar', {
      length: 120,
    }).notNull(),

    nameEn: varchar('name_en', {
      length: 120,
    }).notNull(),

    color: varchar('color', {
      length: 32,
    }),

    ...timestamps,
  },
  (t) => ({
    schoolCodeUnique: uniqueIndex('subjects_school_code_idx').on(t.schoolId, t.code),
    schoolIdx: index('subjects_school_idx').on(t.schoolId, t.nameAr),
  })
)

export const teachingAssignments =
  pgTable(
    'teaching_assignments',
    {
      schoolId: uuid('school_id').references(() => schools.id, { onDelete: 'cascade' }).notNull(),
      id: uuid('id')
        .defaultRandom()
        .primaryKey(),

      teacherId: uuid(
        'teacher_id'
      )
        .references(
          () => teachers.id,
          {
            onDelete: 'cascade',
          }
        )
        .notNull(),

      subjectId: uuid(
        'subject_id'
      )
        .references(
          () => subjects.id,
          {
            onDelete: 'cascade',
          }
        )
        .notNull(),

      classId: uuid('class_id')
        .references(
          () => classes.id,
          {
            onDelete: 'cascade',
          }
        )
        .notNull(),

      academicYear: varchar(
        'academic_year',
        {
          length: 30,
        }
      ).notNull(),

      semester: varchar(
        'semester',
        {
          length: 50,
        }
      ).notNull(),

      ...timestamps,
    }
  )

export const assessments = pgTable(
  'assessments',
  {
    schoolId: uuid('school_id').references(() => schools.id, { onDelete: 'cascade' }).notNull(),
    id: uuid('id')
      .defaultRandom()
      .primaryKey(),

    titleAr: varchar(
      'title_ar',
      {
        length: 160,
      }
    ).notNull(),

    titleEn: varchar(
      'title_en',
      {
        length: 160,
      }
    ).notNull(),

    type: assessmentType('type')
      .default('exam')
      .notNull(),

    subjectId: uuid(
      'subject_id'
    )
      .references(
        () => subjects.id,
        {
          onDelete: 'cascade',
        }
      )
      .notNull(),

    classId: uuid('class_id')
      .references(
        () => classes.id,
        {
          onDelete: 'cascade',
        }
      )
      .notNull(),

    examOrder: integer(
      'exam_order'
    ),

    maxScore: real('max_score')
      .default(100)
      .notNull(),

    startsAt: timestamp(
      'starts_at',
      {
        withTimezone: true,
      }
    ),

    published: boolean(
      'published'
    )
      .default(false)
      .notNull(),

    ...timestamps,
  },
  (t) => ({ schoolIdx: index('assessments_school_idx').on(t.schoolId, t.classId, t.createdAt) })
)

export const grades = pgTable(
  'grades',
  {
    schoolId: uuid('school_id').references(() => schools.id, { onDelete: 'cascade' }).notNull(),
    id: uuid('id')
      .defaultRandom()
      .primaryKey(),

    assessmentId: uuid(
      'assessment_id'
    )
      .references(
        () => assessments.id,
        {
          onDelete: 'cascade',
        }
      )
      .notNull(),

    studentId: uuid(
      'student_id'
    )
      .references(
        () => users.id,
        {
          onDelete: 'cascade',
        }
      )
      .notNull(),

    score: real('score')
      .notNull(),

    feedback: text('feedback'),

    gradedBy: uuid(
      'graded_by'
    ).references(
      () => users.id,
      {
        onDelete: 'set null',
      }
    ),

    gradedAt: timestamp(
      'graded_at',
      {
        withTimezone: true,
      }
    )
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    gradeUnique:
      uniqueIndex(
        'grades_assessment_student_idx'
      ).on(
        t.assessmentId,
        t.studentId
      ),
    schoolStudentIdx: index('grades_school_student_idx').on(t.schoolId, t.studentId, t.gradedAt),
  })
)

export const announcements =
  pgTable(
    'announcements',
    {
      schoolId: uuid('school_id').references(() => schools.id, { onDelete: 'cascade' }).notNull(),
      id: uuid('id')
        .defaultRandom()
        .primaryKey(),

      titleAr: varchar(
        'title_ar',
        {
          length: 240,
        }
      ).notNull(),

      titleEn: varchar(
        'title_en',
        {
          length: 240,
        }
      ).notNull(),

      bodyAr: text(
        'body_ar'
      ).notNull(),

      bodyEn: text(
        'body_en'
      ).notNull(),

      audience: audience(
        'audience'
      )
        .default('all')
        .notNull(),

      classId: uuid(
        'class_id'
      ).references(
        () => classes.id,
        {
          onDelete: 'set null',
        }
      ),

      published: boolean(
        'published'
      )
        .default(false)
        .notNull(),

      publishedAt: timestamp(
        'published_at',
        {
          withTimezone: true,
        }
      ),

      authorId: uuid(
        'author_id'
      ).references(
        () => users.id,
        {
          onDelete: 'set null',
        }
      ),

      ...timestamps,
    },
    (t) => ({ schoolIdx: index('announcements_school_idx').on(t.schoolId, t.published, t.publishedAt) })
  )

export const assignments = pgTable(
  'assignments',
  {
    schoolId: uuid('school_id').references(() => schools.id, { onDelete: 'cascade' }).notNull(),
    id: uuid('id')
      .defaultRandom()
      .primaryKey(),

    titleAr: varchar(
      'title_ar',
      {
        length: 180,
      }
    ).notNull(),

    titleEn: varchar(
      'title_en',
      {
        length: 180,
      }
    ).notNull(),

    descriptionAr: text(
      'description_ar'
    ),

    descriptionEn: text(
      'description_en'
    ),

    subjectId: uuid(
      'subject_id'
    )
      .references(
        () => subjects.id,
        {
          onDelete: 'cascade',
        }
      )
      .notNull(),

    classId: uuid('class_id')
      .references(
        () => classes.id,
        {
          onDelete: 'cascade',
        }
      )
      .notNull(),

    teacherId: uuid(
      'teacher_id'
    ).references(
      () => teachers.id,
      {
        onDelete: 'set null',
      }
    ),

    dueAt: timestamp('due_at', {
      withTimezone: true,
    }).notNull(),

    published: boolean(
      'published'
    )
      .default(false)
      .notNull(),

    maxScore: real(
      'max_score'
    )
      .default(100)
      .notNull(),

    ...timestamps,
  },
  (t) => ({ schoolIdx: index('assignments_school_idx').on(t.schoolId, t.classId, t.dueAt) })
)

export const files = pgTable(
  'files',
  {
    schoolId: uuid('school_id').references(() => schools.id, { onDelete: 'cascade' }).notNull(),
    id: uuid('id')
      .defaultRandom()
      .primaryKey(),

    ownerId: uuid(
      'owner_id'
    ).references(
      () => users.id,
      {
        onDelete: 'set null',
      }
    ),

    name: varchar('name', {
      length: 255,
    }).notNull(),

    url: text('url').notNull(),

    mimeType: varchar(
      'mime_type',
      {
        length: 120,
      }
    ),

    sizeBytes: integer(
      'size_bytes'
    ),

    folder: varchar(
      'folder',
      {
        length: 120,
      }
    ),

    visibility: audience(
      'visibility'
    )
      .default('all')
      .notNull(),

    ...timestamps,
  },
  (t) => ({ schoolIdx: index('files_school_idx').on(t.schoolId, t.visibility, t.createdAt) })
)

export const assignmentSubmissions =
  pgTable(
    'assignment_submissions',
    {
      schoolId: uuid('school_id').references(() => schools.id, { onDelete: 'cascade' }).notNull(),
      id: uuid('id')
        .defaultRandom()
        .primaryKey(),

      assignmentId: uuid(
        'assignment_id'
      )
        .references(
          () => assignments.id,
          {
            onDelete: 'cascade',
          }
        )
        .notNull(),

      studentId: uuid(
        'student_id'
      )
        .references(
          () => users.id,
          {
            onDelete: 'cascade',
          }
        )
        .notNull(),

      fileId: uuid(
        'file_id'
      ).references(
        () => files.id,
        {
          onDelete: 'set null',
        }
      ),

      submittedAt: timestamp(
        'submitted_at',
        {
          withTimezone: true,
        }
      ),

      score: real('score'),

      feedback: text(
        'feedback'
      ),
    },
    (t) => ({
      submissionUnique:
        uniqueIndex(
          'assignment_student_idx'
        ).on(
          t.assignmentId,
          t.studentId
        ),
    })
  )

export const calendarEvents =
  pgTable(
    'calendar_events',
    {
      schoolId: uuid('school_id').references(() => schools.id, { onDelete: 'cascade' }).notNull(),
      id: uuid('id')
        .defaultRandom()
        .primaryKey(),

      titleAr: varchar(
        'title_ar',
        {
          length: 180,
        }
      ).notNull(),

      titleEn: varchar(
        'title_en',
        {
          length: 180,
        }
      ).notNull(),

      descriptionAr: text(
        'description_ar'
      ),

      descriptionEn: text(
        'description_en'
      ),

      startsAt: timestamp(
        'starts_at',
        {
          withTimezone: true,
        }
      ).notNull(),

      endsAt: timestamp(
        'ends_at',
        {
          withTimezone: true,
        }
      ),

      location: varchar(
        'location',
        {
          length: 180,
        }
      ),

      classId: uuid(
        'class_id'
      ).references(
        () => classes.id,
        {
          onDelete: 'set null',
        }
      ),

      subjectId: uuid(
        'subject_id'
      ).references(
        () => subjects.id,
        {
          onDelete: 'set null',
        }
      ),

      createdBy: uuid(
        'created_by'
      ).references(
        () => users.id,
        {
          onDelete: 'set null',
        }
      ),

      ...timestamps,
    },
    (t) => ({ schoolIdx: index('calendar_events_school_idx').on(t.schoolId, t.startsAt) })
  )

export const messageRequests =
  pgTable(
    'message_requests',
    {
      schoolId: uuid('school_id').references(() => schools.id, { onDelete: 'cascade' }),
      channel: messageChannel('channel').default('school').notNull(),
      id: uuid('id')
        .defaultRandom()
        .primaryKey(),

      senderId: uuid(
        'sender_id'
      )
        .references(
          () => users.id,
          {
            onDelete: 'cascade',
          }
        )
        .notNull(),

      recipientId: uuid(
        'recipient_id'
      )
        .references(
          () => users.id,
          {
            onDelete: 'cascade',
          }
        )
        .notNull(),

      subject: varchar(
        'subject',
        {
          length: 180,
        }
      ),

      body: text('body')
        .notNull(),

      status: messageStatus(
        'status'
      )
        .default('pending')
        .notNull(),

      createdAt: timestamp(
        'created_at',
        {
          withTimezone: true,
        }
      )
        .defaultNow()
        .notNull(),

      readAt: timestamp(
        'read_at',
        {
          withTimezone: true,
        }
      ),
    },
    (t) => ({
      channelSchoolCheck: check('message_requests_channel_school_check', sql`(${t.channel} = 'school' and ${t.schoolId} is not null) or ${t.channel} = 'social'`),
      schoolChannelIdx: index('messages_school_channel_idx').on(t.schoolId, t.channel, t.createdAt),
    })
  )

export const communityPosts =
  pgTable(
    'community_posts',
    {
      schoolId: uuid('school_id').references(() => schools.id, { onDelete: 'cascade' }),
      scope: communityScope('scope').default('school').notNull(),
      id: uuid('id')
        .defaultRandom()
        .primaryKey(),

      authorId: uuid(
        'author_id'
      )
        .references(
          () => users.id,
          {
            onDelete: 'cascade',
          }
        )
        .notNull(),

      title: varchar(
        'title',
        {
          length: 180,
        }
      ),

      body: text('body')
        .notNull(),

      published: boolean(
        'published'
      )
        .default(false)
        .notNull(),

      pinned: boolean(
        'pinned'
      )
        .default(false)
        .notNull(),

      ...timestamps,
    },
    (t) => ({
      scopeSchoolCheck: check('community_posts_scope_school_check', sql`(${t.scope} = 'school' and ${t.schoolId} is not null) or (${t.scope} = 'platform' and ${t.schoolId} is null)`),
      feedIdx: index('community_posts_feed_idx').on(t.scope, t.schoolId, t.published, t.pinned, t.createdAt),
      authorIdx: index('community_posts_author_idx').on(t.authorId, t.createdAt),
    })
  )

export const communityComments =
  pgTable(
    'community_comments',
    {
      id: uuid('id')
        .defaultRandom()
        .primaryKey(),

      postId: uuid('post_id')
        .references(
          () => communityPosts.id,
          {
            onDelete: 'cascade',
          }
        )
        .notNull(),

      authorId: uuid(
        'author_id'
      )
        .references(
          () => users.id,
          {
            onDelete: 'cascade',
          }
        )
        .notNull(),

      body: text('body')
        .notNull(),

      published: boolean(
        'published'
      )
        .default(false)
        .notNull(),

      ...timestamps,
    }
  )

export const communityPostVotes =
  pgTable(
    'community_post_votes',
    {
      id: uuid('id')
        .defaultRandom()
        .primaryKey(),

      postId: uuid('post_id')
        .references(
          () => communityPosts.id,
          {
            onDelete: 'cascade',
          }
        )
        .notNull(),

      userId: uuid('user_id')
        .references(
          () => users.id,
          {
            onDelete: 'cascade',
          }
        )
        .notNull(),

      value: integer(
        'value'
      ).notNull(),

      ...timestamps,
    },
    (t) => ({
      postUserUnique:
        uniqueIndex(
          'community_post_votes_post_user_idx'
        ).on(
          t.postId,
          t.userId
        ),
    })
  )

export const rules = pgTable(
  'rules',
  {
    schoolId: uuid('school_id').references(() => schools.id, { onDelete: 'cascade' }).notNull(),
    id: uuid('id')
      .defaultRandom()
      .primaryKey(),

    titleAr: varchar(
      'title_ar',
      {
        length: 180,
      }
    ).notNull(),

    titleEn: varchar(
      'title_en',
      {
        length: 180,
      }
    ).notNull(),

    bodyAr: text(
      'body_ar'
    ).notNull(),

    bodyEn: text(
      'body_en'
    ).notNull(),

    sortOrder: integer(
      'sort_order'
    )
      .default(0)
      .notNull(),

    published: boolean(
      'published'
    )
      .default(true)
      .notNull(),

    ...timestamps,
  }
)

export const notifications =
  pgTable(
    'notifications',
    {
      schoolId: uuid('school_id').references(() => schools.id, { onDelete: 'cascade' }),
      id: uuid('id')
        .defaultRandom()
        .primaryKey(),

      userId: uuid(
        'user_id'
      ).references(
        () => users.id,
        {
          onDelete: 'cascade',
        }
      ),

      titleAr: varchar(
        'title_ar',
        {
          length: 200,
        }
      ).notNull(),

      titleEn: varchar(
        'title_en',
        {
          length: 200,
        }
      ).notNull(),

      bodyAr: text(
        'body_ar'
      ).notNull(),

      bodyEn: text(
        'body_en'
      ).notNull(),

      readAt: timestamp(
        'read_at',
        {
          withTimezone: true,
        }
      ),

      createdAt: timestamp(
        'created_at',
        {
          withTimezone: true,
        }
      )
        .defaultNow()
        .notNull(),
    }
  )

export const schoolLocations =
  pgTable(
    'school_locations',
    {
      schoolId: uuid('school_id').references(() => schools.id, { onDelete: 'cascade' }).notNull(),
      id: uuid('id')
        .defaultRandom()
        .primaryKey(),

      nameAr: varchar(
        'name_ar',
        {
          length: 120,
        }
      ).notNull(),

      nameEn: varchar(
        'name_en',
        {
          length: 120,
        }
      ).notNull(),

      descriptionAr: text(
        'description_ar'
      ),

      descriptionEn: text(
        'description_en'
      ),

      latitude: real(
        'latitude'
      ),

      longitude: real(
        'longitude'
      ),

      mapX: real('map_x'),

      mapY: real('map_y'),

      icon: varchar('icon', {
        length: 40,
      }),

      ...timestamps,
    }
  )

export const attendanceRecords =
  pgTable(
    'attendance_records',
    {
      schoolId: uuid('school_id').references(() => schools.id, { onDelete: 'cascade' }).notNull(),
      id: uuid('id')
        .defaultRandom()
        .primaryKey(),

      studentId: uuid(
        'student_id'
      )
        .references(
          () => users.id,
          {
            onDelete: 'cascade',
          }
        )
        .notNull(),

      date: timestamp('date', {
        withTimezone: true,
      }).notNull(),

      status:
        attendanceStatus(
          'status'
        ).notNull(),

      note: text('note'),

      recordedBy: uuid(
        'recorded_by'
      ).references(
        () => users.id,
        {
          onDelete: 'set null',
        }
      ),

      ...timestamps,
    },
    (t) => ({ schoolStudentIdx: index('attendance_school_student_idx').on(t.schoolId, t.studentId, t.date) })
  )

export const siteSettings =
  pgTable(
    'site_settings',
    {
      key: varchar('key', {
        length: 120,
      }).primaryKey(),

      value: jsonb('value')
        .notNull()
        .default(
          sql`'{}'::jsonb`
        ),

      ...timestamps,
    }
  )

export const registrationRequests =
  pgTable(
    'registration_requests',
    {
      schoolId: uuid('school_id').references(() => schools.id, { onDelete: 'cascade' }),
      inviteId: uuid('invite_id').references(() => schoolInvites.id, { onDelete: 'set null' }),
      id: uuid('id')
        .defaultRandom()
        .primaryKey(),

      googleSubject: varchar(
        'google_subject',
        {
          length: 255,
        }
      ),

      email: varchar('email', {
        length: 320,
      }).notNull(),

      username: varchar('username', { length: 32 }),

      passwordHash: text('password_hash'),

      requestedRole: userRole('requested_role').default('student').notNull(),

      subjectId: uuid('subject_id').references(() => subjects.id, { onDelete: 'set null' }),

      googleName: varchar(
        'google_name',
        {
          length: 160,
        }
      ),

      fullName: varchar(
        'full_name',
        {
          length: 160,
        }
      ),

      birthDate: date(
        'birth_date'
      ),

      phone: varchar('phone', {
        length: 40,
      }),

      classId: uuid(
        'class_id'
      ).references(
        () => classes.id,
        {
          onDelete: 'set null',
        }
      ),

      status:
        registrationStatus(
          'status'
        )
          .default('draft')
          .notNull(),

      reviewedBy: uuid(
        'reviewed_by'
      ).references(
        () => users.id,
        {
          onDelete: 'set null',
        }
      ),

      reviewedAt: timestamp(
        'reviewed_at',
        {
          withTimezone: true,
        }
      ),

      rejectionReason: text(
        'rejection_reason'
      ),

      ...timestamps,
    },
    (t) => ({
      usernameMinLengthCheck: check('registration_requests_username_min_length_check', sql`${t.username} is null or char_length(${t.username}) >= 5`),
      schoolStatusCheck: check('registration_requests_school_status_check', sql`(${t.status} = 'draft' and ${t.schoolId} is null) or (${t.status} <> 'draft' and ${t.schoolId} is not null)`),
      schoolStatusIdx: index('registrations_school_status_idx').on(t.schoolId, t.status, t.createdAt),
    })
  )

export const loginAttempts =
  pgTable(
    'login_attempts',
    {
      keyHash: varchar(
        'key_hash',
        {
          length: 128,
        }
      ).primaryKey(),

      failures: integer(
        'failures'
      )
        .default(0)
        .notNull(),

      firstFailedAt:
        timestamp(
          'first_failed_at',
          {
            withTimezone: true,
          }
        )
          .defaultNow()
          .notNull(),

      blockedUntil:
        timestamp(
          'blocked_until',
          {
            withTimezone: true,
          }
        ),

      updatedAt:
        timestamp(
          'updated_at',
          {
            withTimezone: true,
          }
        )
          .defaultNow()
          .notNull(),
    }
  )

export const requestRateLimits =
  pgTable(
    'request_rate_limits',
    {
      keyHash: varchar(
        'key_hash',
        {
          length: 128,
        }
      ).primaryKey(),

      windowStartedAt:
        timestamp(
          'window_started_at',
          {
            withTimezone: true,
          }
        )
          .defaultNow()
          .notNull(),

      requestCount:
        integer(
          'request_count'
        )
          .default(0)
          .notNull(),

      blockedUntil:
        timestamp(
          'blocked_until',
          {
            withTimezone: true,
          }
        ),

      updatedAt:
        timestamp(
          'updated_at',
          {
            withTimezone: true,
          }
        )
          .defaultNow()
          .notNull(),
    }
  )

export const authChallenges =
  pgTable(
    'auth_challenges',
    {
      id: uuid('id')
        .defaultRandom()
        .primaryKey(),

      tokenHash: varchar(
        'token_hash',
        {
          length: 128,
        }
      )
        .notNull()
        .unique(),

      userId: uuid('user_id')
        .references(
          () => users.id,
          {
            onDelete: 'cascade',
          }
        )
        .notNull(),

      attempts: integer(
        'attempts'
      )
        .default(0)
        .notNull(),

      expiresAt: timestamp(
        'expires_at',
        {
          withTimezone: true,
        }
      ).notNull(),

      createdAt: timestamp(
        'created_at',
        {
          withTimezone: true,
        }
      )
        .defaultNow()
        .notNull(),
    }
  )

export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id')
      .defaultRandom()
      .primaryKey(),

    tokenHash: varchar(
      'token_hash',
      {
        length: 128,
      }
    )
      .notNull()
      .unique(),

    userId: uuid('user_id')
      .references(
        () => users.id,
        {
          onDelete: 'cascade',
        }
      )
      .notNull(),

    expiresAt: timestamp(
      'expires_at',
      {
        withTimezone: true,
      }
    ).notNull(),

    createdAt: timestamp(
      'created_at',
      {
        withTimezone: true,
      }
    )
      .defaultNow()
      .notNull(),
  }
)

export const usersRelations =
  relations(
    users,
    ({ one, many }) => ({
      class: one(classes, {
        fields: [users.classId],
        references: [classes.id],
      }),

      teacher: one(teachers, {
        fields: [users.id],
        references: [teachers.userId],
      }),

      grades: many(grades),

      ownedFiles: many(files),

      sessions: many(sessions),

      authChallenges:
        many(authChallenges),

      registrationRequests:
        many(registrationRequests),
    })
  )

export const classesRelations =
  relations(
    classes,
    ({ many }) => ({
      users: many(users),
    })
  )

export const registrationRequestsRelations =
  relations(
    registrationRequests,
    ({ one }) => ({
      class: one(classes, {
        fields: [
          registrationRequests.classId,
        ],
        references: [classes.id],
      }),

      reviewer: one(users, {
        fields: [
          registrationRequests.reviewedBy,
        ],
        references: [users.id],
      }),
    })
  )

export const teachersRelations =
  relations(
    teachers,
    ({ one }) => ({
      user: one(users, {
        fields: [teachers.userId],
        references: [users.id],
      }),
    })
  )

export type User =
  typeof users.$inferSelect

export type NewUser =
  typeof users.$inferInsert
