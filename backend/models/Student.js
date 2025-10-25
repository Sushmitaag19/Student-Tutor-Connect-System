module.exports = (sequelize, DataTypes) => {
  const Student = sequelize.define('Student', {
    student_id: {
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
    academic_level: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    preferred_mode: {
      type: DataTypes.ENUM('online', 'offline', 'hybrid'),
      allowNull: true
    },
    budget: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      validate: {
        min: 0
      }
    },
    availability: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    learning_goals: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    subjects_of_interest: {
      type: DataTypes.ARRAY(DataTypes.STRING),
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
    tableName: 'students',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  Student.associate = (models) => {
    Student.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });
    
    Student.hasMany(models.Session, {
      foreignKey: 'student_id',
      as: 'sessions'
    });
    
    Student.hasMany(models.Rating, {
      foreignKey: 'student_id',
      as: 'ratings'
    });
    
    Student.hasMany(models.Question, {
      foreignKey: 'student_id',
      as: 'questions'
    });
  };

  return Student;
};
