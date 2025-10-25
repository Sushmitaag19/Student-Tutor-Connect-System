module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    user_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    full_name: {
      type: DataTypes.STRING(40),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 40]
      }
    },
    email: {
      type: DataTypes.STRING(40),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        len: [6, 255]
      }
    },
    role: {
      type: DataTypes.ENUM('student', 'tutor', 'admin'),
      allowNull: false,
      defaultValue: 'student'
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    last_login: {
      type: DataTypes.DATE
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
    tableName: 'users',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    hooks: {
      beforeUpdate: (user) => {
        user.updated_at = new Date();
      }
    }
  });

  User.associate = (models) => {
    User.hasOne(models.Student, {
      foreignKey: 'user_id',
      as: 'studentProfile'
    });
    
    User.hasOne(models.Tutor, {
      foreignKey: 'user_id',
      as: 'tutorProfile'
    });
    
    User.hasMany(models.Session, {
      foreignKey: 'student_id',
      as: 'studentSessions'
    });
    
    User.hasMany(models.Rating, {
      foreignKey: 'student_id',
      as: 'ratingsGiven'
    });
    
    User.hasMany(models.Question, {
      foreignKey: 'student_id',
      as: 'questions'
    });
    
    User.hasMany(models.Answer, {
      foreignKey: 'tutor_id',
      as: 'answers'
    });
    
    User.hasMany(models.Notification, {
      foreignKey: 'user_id',
      as: 'notifications'
    });
  };

  return User;
};
