module.exports = (sequelize, DataTypes) => {
  const Vote = sequelize.define('Vote', {
    vote_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    answer_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'answers',
        key: 'answer_id'
      }
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'user_id'
      }
    },
    vote_type: {
      type: DataTypes.ENUM('upvote', 'downvote'),
      allowNull: false
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'votes',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    indexes: [
      {
        unique: true,
        fields: ['answer_id', 'user_id']
      }
    ]
  });

  Vote.associate = (models) => {
    Vote.belongsTo(models.Answer, {
      foreignKey: 'answer_id',
      as: 'answer'
    });
    
    Vote.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });
  };

  return Vote;
};
