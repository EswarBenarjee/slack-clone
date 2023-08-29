const Workspace = require("../../models/Workspace");

const isWorkspaceAdmin = async (workspaceId, userId) => {
  Workspace.findById(workspaceId)
    .then((workspace) => {
      if (!workspace || !workspace.admins.includes(userId)) return false;

      return true;
    })
    .catch((err) => {
      return false;
    });
};

module.exports = isWorkspaceAdmin;
