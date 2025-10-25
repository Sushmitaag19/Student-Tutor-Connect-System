module.exports = (sequelize, DataTypes) => {
  const Session = sequelize.define('Session', {
    session_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    student_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'students',
        key: 'student_id'
      }
    },
    tutor_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'tutors',
        key: 'tutor_id'
      }
    },
    subject_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'subjects',
        key: 'subject_id'
      }
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    scheduled_date: {
      type: DataTypes.DATE,
      allowNull: false
    },
    duration_minutes: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 60,
      validate: {
        min: 15,
        max: 480
      }
    },
    mode: {
      type: DataTypes.ENUM('online', 'offline', 'hybrid'),
      allowNull: false
    },
    location: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    meeting_link: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('pending', 'accepted', 'rejected', 'completed', 'cancelled'),
      allowNull: false,
      defaultValue: 'pending'
    },
    hourly_rate: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    total_cost: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    completed_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'sessions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  Session.associate = (models) => {
    Session.belongsTo(models.Student, {
      foreignKey: 'student_id',
      as: 'student'
    });
    
    Session.belongsTo(models.Tutor, {
      foreignKey: 'tutor_id',
      as: 'tutor'
    });
    
    Session.belongsTo(models.Subject, {
      foreignKey: 'subject_id',
      as: 'subject'
    });
  };

  return Session;
};
