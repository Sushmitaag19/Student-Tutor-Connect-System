module.exports = (sequelize, DataTypes) => {
  const TutorVerification = sequelize.define('TutorVerification', {
    verification_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    tutor_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      references: {
        model: 'tutors',
        key: 'tutor_id'
      }
    },
    test_score: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0,
        max: 100
      }
    },
    qualifications: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      allowNull: true
    },
    documents: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true
    },
    is_auto_verified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    is_approved: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    approved_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'user_id'
      }
    },
    approval_notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    verification_date: {
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
    tableName: 'tutor_verifications',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  TutorVerification.associate = (models) => {
    TutorVerification.belongsTo(models.Tutor, {
      foreignKey: 'tutor_id',
      as: 'tutor'
    });
    
    TutorVerification.belongsTo(models.User, {
      foreignKey: 'approved_by',
      as: 'approver'
    });
  };

  return TutorVerification;
};
