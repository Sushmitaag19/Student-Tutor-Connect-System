module.exports = (sequelize, DataTypes) => {
  const Tutor = sequelize.define('Tutor', {
    tutor_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      references: {
        model: 'users',
        key: 'user_id'
      }
    },
    bio: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    experience: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    hourly_rate: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      validate: {
        min: 0
      }
    },
    preferred_mode: {
      type: DataTypes.ENUM('online', 'offline', 'hybrid'),
      allowNull: true
    },
    verified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    is_auto_verified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    is_approved: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    profile_picture: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    availability: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    qualifications: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      allowNull: true
    },
    documents: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true
    },
    average_rating: {
      type: DataTypes.DECIMAL(3, 2),
      defaultValue: 0.00,
      validate: {
        min: 0,
        max: 5
      }
    },
    rating_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    total_sessions: {
      type: DataTypes.INTEGER,
      defaultValue: 0
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
    tableName: 'tutors',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  Tutor.associate = (models) => {
    Tutor.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });
    
    Tutor.hasMany(models.Session, {
      foreignKey: 'tutor_id',
      as: 'sessions'
    });
    
    Tutor.hasMany(models.Rating, {
      foreignKey: 'tutor_id',
      as: 'ratings'
    });
    
    Tutor.hasMany(models.Answer, {
      foreignKey: 'tutor_id',
      as: 'answers'
    });
    
    Tutor.belongsToMany(models.Subject, {
      through: models.TutorSubject,
      foreignKey: 'tutor_id',
      as: 'subjects'
    });
    
    Tutor.hasOne(models.TutorVerification, {
      foreignKey: 'tutor_id',
      as: 'verification'
    });
  };

  return Tutor;
};
