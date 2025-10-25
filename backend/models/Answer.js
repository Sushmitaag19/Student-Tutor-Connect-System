module.exports = (sequelize, DataTypes) => {
  const Answer = sequelize.define('Answer', {
    answer_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    question_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'questions',
        key: 'question_id'
      }
    },
    tutor_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'tutors',
        key: 'tutor_id'
      }
    },
    student_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'students',
        key: 'student_id'
      }
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    is_best_answer: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    upvotes: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    downvotes: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    is_verified: {
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
    tableName: 'answers',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  Answer.associate = (models) => {
    Answer.belongsTo(models.Question, {
      foreignKey: 'question_id',
      as: 'question'
    });
    
    Answer.belongsTo(models.Tutor, {
      foreignKey: 'tutor_id',
      as: 'tutor'
    });
    
    Answer.belongsTo(models.Student, {
      foreignKey: 'student_id',
      as: 'student'
    });
    
    Answer.hasMany(models.Vote, {
      foreignKey: 'answer_id',
      as: 'votes'
    });
  };

  return Answer;
};
