#!/bin/sh

if [ $# != 1 ]
then
  echo 'Usage: merge-branch BRANCH' 1>&2
  exit 1
fi

branch=$1
git merge -Xsubtree=demos/$branch --squash $branch
