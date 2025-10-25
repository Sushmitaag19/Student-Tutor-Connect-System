module.exports = (sequelize, DataTypes) => {
  const TutorSubject = sequelize.define('TutorSubject', {
    tutor_subject_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
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
    proficiency_level: {
      type: DataTypes.ENUM('beginner', 'intermediate', 'advanced', 'expert'),
      allowNull: false,
      defaultValue: 'intermediate'
    },
    years_experience: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0
      }
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'tutor_subjects',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
  });

  TutorSubject.associate = (models) => {
    TutorSubject.belongsTo(models.Tutor, {
      foreignKey: 'tutor_id',
      as: 'tutor'
    });
    
    TutorSubject.belongsTo(models.Subject, {
      foreignKey: 'subject_id',
      as: 'subject'
    });
  };

  return TutorSubject;
};
