module.exports = (sequelize, DataTypes) => {
  const Rating = sequelize.define('Rating', {
    rating_id: {
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
    session_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'sessions',
        key: 'session_id'
      }
    },
    rating: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 5
      }
    },
    feedback: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    communication_rating: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
        max: 5
      }
    },
    knowledge_rating: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
        max: 5
      }
    },
    punctuality_rating: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
        max: 5
      }
    },
    is_anonymous: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
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
    tableName: 'ratings',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['student_id', 'tutor_id', 'session_id']
      }
    ]
  });

  Rating.associate = (models) => {
    Rating.belongsTo(models.Student, {
      foreignKey: 'student_id',
      as: 'student'
    });
    
    Rating.belongsTo(models.Tutor, {
      foreignKey: 'tutor_id',
      as: 'tutor'
    });
    
    Rating.belongsTo(models.Session, {
      foreignKey: 'session_id',
      as: 'session'
    });
  };

  return Rating;
};
