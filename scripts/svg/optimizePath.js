export function optimizePathGreedy(lines, penWidth) {
  if (!lines || lines.length === 0) return [];
  const pws = penWidth * penWidth;

  const frontier = lines.slice(0);
  let cNode = frontier.pop();
  const explored = [cNode];

  while (frontier.length) {
    let reversed = false;
    let pathIndex = -1;
    let closestDist = Infinity;

    const cEndX = cNode[cNode.length - 2];
    const cEndY = cNode[cNode.length - 1];

    for (let i = 0; i < frontier.length; i++) {
      const path = frontier[i];

      // normal
      let dx = cEndX - path[0];
      let dy = cEndY - path[1];
      let dist = dx * dx + dy * dy;
      if (dist < closestDist) {
        reversed = false;
        pathIndex = i;
        closestDist = dist;
      }

      // reversed
      dx = cEndX - path[path.length - 2];
      dy = cEndY - path[path.length - 1];
      dist = dx * dx + dy * dy;
      if (dist < closestDist) {
        reversed = true;
        pathIndex = i;
        closestDist = dist;
      }
    }

    cNode = frontier[pathIndex];
    frontier.splice(pathIndex, 1);

    if (reversed) {
      const nn = new Array(cNode.length);
      for (let i = 0, j = cNode.length - 2; j >= 0; i += 2, j -= 2) {
        nn[i] = cNode[j];
        nn[i + 1] = cNode[j + 1];
      }
      cNode = nn;
    }

    if (closestDist < pws) explored[explored.length - 1] = explored[explored.length - 1].concat(cNode);
    else explored.push(cNode);
  }

  return explored;
}
