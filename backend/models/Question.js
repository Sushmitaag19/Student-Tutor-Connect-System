module.exports = (sequelize, DataTypes) => {
  const Question = sequelize.define('Question', {
    question_id: {
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
    subject_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'subjects',
        key: 'subject_id'
      }
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    tags: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true
    },
    is_urgent: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    is_resolved: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    view_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    answer_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    best_answer_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'answers',
        key: 'answer_id'
      }
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
    tableName: 'questions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  Question.associate = (models) => {
    Question.belongsTo(models.Student, {
      foreignKey: 'student_id',
      as: 'student'
    });
    
    Question.belongsTo(models.Subject, {
      foreignKey: 'subject_id',
      as: 'subject'
    });
    
    Question.hasMany(models.Answer, {
      foreignKey: 'question_id',
      as: 'answers'
    });
    
    Question.belongsTo(models.Answer, {
      foreignKey: 'best_answer_id',
      as: 'bestAnswer'
    });
  };

  return Question;
};
